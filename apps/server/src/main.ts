// Server do jogo: HTTP estático (apps/web/public) + WebSocket.
// Cada conexão = 1 barista; cada cliente atendido = 1 CustomerAgent (claude -p).
//   npm run jogo   → http://localhost:3000
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocketServer, type WebSocket } from "ws";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { CustomerAgent, openingMessage, type Line, type Turn } from "@cafe/agents";
import { Modifier, OrderItem, type Customer, type MenuItem, type Order } from "@cafe/shared";
import { parseServe, splitAction } from "@cafe/shared/parse";
import { z } from "zod";

const PORT = Number(process.env.PORT ?? 3000);
const PUBLIC = fileURLToPath(new URL("../../web/public/", import.meta.url));
const MCP_ENTRY = fileURLToPath(new URL("../../../packages/mcp-cafe/src/index.ts", import.meta.url));

// ---------- MCP (um client para o server inteiro) ----------
const mcp = new Client({ name: "cafe-server", version: "0.1.0" });
await mcp.connect(new StdioClientTransport({ command: process.execPath, args: [MCP_ENTRY], stderr: "ignore" }));

async function call<T>(name: string, a: Record<string, unknown> = {}): Promise<T> {
  const r = await mcp.callTool({ name, arguments: a });
  const text = (r.content as { text: string }[])[0]?.text ?? "";
  if (r.isError) throw new Error(text);
  return JSON.parse(text) as T;
}
async function customer(id: string): Promise<Customer> {
  const res = await mcp.readResource({ uri: `cafe://customers/${id}` });
  return JSON.parse((res.contents[0] as { text: string }).text) as Customer;
}

// ---------- protocolo WS ----------
const ClientMsg = z.discriminatedUnion("type", [
  z.object({ type: z.literal("hello") }),
  z.object({ type: z.literal("warm"), customerId: z.string().optional() }),
  z.object({ type: z.literal("next"), customerId: z.string().optional() }),
  z.object({ type: z.literal("say"), text: z.string().min(1).max(500) }),
  z.object({ type: z.literal("serve"), items: z.array(OrderItem).min(1), text: z.string().max(500).default("") }),
  z.object({ type: z.literal("bye") }),
]);

type Out =
  | { type: "init"; menu: MenuItem[]; modifiers: readonly string[]; customers: Pick<Customer, "id" | "name" | "archetype">[]; score: unknown }
  | { type: "arrive"; customer: Customer }
  | { type: "thinking"; on: boolean }
  | { type: "line"; emotion: string | null; speech: string; ms: number; tokens: Turn["usage"] }
  | { type: "tool"; name: string; input: unknown }
  | { type: "order"; order: Order | null }
  | { type: "served"; points: number; accuracy: number; issues: string[] }
  | { type: "react"; emotion: string; tip: number }
  | { type: "leave"; score: unknown }
  | { type: "error"; message: string };

async function customerIds(): Promise<string[]> {
  return (await mcp.listResources()).resources
    .map((r) => r.uri)
    .filter((u) => u.startsWith("cafe://customers/"))
    .map((u) => u.split("/").pop()!);
}

class Session {
  readonly ws: WebSocket;
  agent: CustomerAgent | null = null;
  /** Próximo cliente com o processo `claude` já de pé (spawn não gasta token). */
  warmAgent: CustomerAgent | null = null;
  current: Customer | null = null;
  lastId: string | null = null;
  busy = false;
  awaitingReaction = false;
  spoke = false;
  turnStarted = 0;
  menu: MenuItem[] | null = null;

  constructor(ws: WebSocket) {
    this.ws = ws;
  }

  send(m: Out): void {
    if (this.ws.readyState === this.ws.OPEN) this.ws.send(JSON.stringify(m));
  }

  async init(): Promise<void> {
    const [menu, all, score] = await Promise.all([
      call<MenuItem[]>("get_menu"),
      mcp.listResources(),
      call("get_score"),
    ]);
    const customers = await Promise.all(
      all.resources.filter((r) => r.uri.startsWith("cafe://customers/")).map((r) => customer(r.uri.split("/").pop()!)),
    );
    this.menu = menu;
    this.send({ type: "init", menu, modifiers: Modifier.options, customers: customers.map(({ id, name, archetype }) => ({ id, name, archetype })), score });
    await this.warm();
  }

  async pickRandom(): Promise<string> {
    const all = await customerIds();
    const pool = all.filter((x) => x !== this.lastId);
    return pool[Math.floor(Math.random() * pool.length)] ?? all[0]!;
  }

  /** Pré-aquece o processo do cliente escolhido (ou de um aleatório). */
  async warm(customerId?: string): Promise<void> {
    const id = customerId ?? this.warmAgent?.customerId ?? (await this.pickRandom());
    if (this.warmAgent?.customerId === id) return;
    this.warmAgent?.close();
    this.warmAgent = new CustomerAgent(id).warm();
  }

  async next(customerId?: string): Promise<void> {
    this.dismiss();
    const id = customerId ?? this.warmAgent?.customerId ?? (await this.pickRandom());
    // Pedidos esquecidos abertos desse cliente atrapalham o serve: cancela.
    for (const o of await call<Order[]>("get_queue")) {
      if (o.customerId === id) await call("close_order", { orderId: o.id, status: "cancelado", memory: "saiu sem ser atendido da última vez" }).catch(() => {});
    }
    this.current = await customer(id);
    this.lastId = id;
    this.awaitingReaction = false;
    this.send({ type: "arrive", customer: this.current });

    let agent: CustomerAgent;
    if (this.warmAgent?.customerId === id) {
      agent = this.warmAgent;
      this.warmAgent = null;
    } else {
      agent = new CustomerAgent(id);
    }
    this.agent = agent;
    // Fala chega antes do turno acabar → manda já (TTS começa enquanto tools rodam).
    agent.on("speech", (l: Line) => {
      if (this.spoke) return;
      this.spoke = true;
      this.send({ type: "line", emotion: l.emotion, speech: l.speech, ms: Date.now() - this.turnStarted, tokens: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 } });
    });
    agent.on("tool", (name: string, input: unknown) => this.send({ type: "tool", name: name.replace("mcp__cafe__", ""), input }));
    agent.on("stderr", (l: string) => process.env.DEBUG && console.error(`[claude ${id}] ${l}`));
    const persona = ((await mcp.callTool({ name: "get_persona", arguments: { customerId: id } })).content as { text: string }[])[0]!.text;
    await this.turn(openingMessage(id, persona, this.menu ?? (await call<MenuItem[]>("get_menu"))));
  }

  async turn(text: string): Promise<void> {
    if (!this.agent || this.busy) return;
    this.busy = true;
    this.send({ type: "thinking", on: true });
    try {
      this.spoke = false;
      this.turnStarted = Date.now();
      const t = await this.agent.send(text);
      if (!this.spoke) this.send({ type: "line", emotion: t.emotion, speech: t.speech, ms: t.ms, tokens: t.usage });
      // Reação inline ("[encantado +8] ...") → o orquestrador registra via MCP.
      if (this.awaitingReaction && this.current) {
        this.awaitingReaction = false;
        const emotion = t.emotion ?? "neutro";
        const tip = t.tip ?? 0;
        await call("react", { customerId: this.current.id, emotion, tip }).catch(() => {});
        this.send({ type: "react", emotion, tip });
      }
      const names = t.tools.map((x) => x.name.replace("mcp__cafe__", ""));
      if (names.some((n) => n === "create_order" || n === "change_order")) await this.pushOrder();
      if (names.includes("close_order")) {
        this.send({ type: "leave", score: await call("get_score") });
        this.dismiss();
        await this.warm(); // já deixa o próximo de pé
      }
    } catch (e) {
      const msg = (e as Error).message;
      this.send({ type: "error", message: /login/i.test(msg) ? "CLI `claude` sem login. Rode `claude` → /login." : msg });
    } finally {
      this.busy = false;
      this.send({ type: "thinking", on: false });
    }
  }

  async openOrder(): Promise<Order | null> {
    if (!this.current) return null;
    return (await call<Order[]>("get_queue")).filter((o) => o.customerId === this.current!.id).at(-1) ?? null;
  }

  async pushOrder(): Promise<void> {
    this.send({ type: "order", order: await this.openOrder() });
  }

  async serve(items: OrderItem[], text: string): Promise<void> {
    if (!this.agent || this.busy) return;
    const said = text ? ` O barista disse: "${text}".` : "";
    const order = await this.openOrder();
    if (!order) return this.turn(`[EVENTO]${said} O barista quer entregar, mas você ainda não registrou o pedido.`);
    const r = await call<{ points: number; accuracy: number; issues: string[] }>("serve", { orderId: order.id, prepared: items });
    this.send({ type: "served", ...r });
    this.send({ type: "order", order: null });
    this.awaitingReaction = true;
    const desc = items.map((i) => `${i.itemId} ${i.size}${i.modifiers.length ? ` (${i.modifiers.join(", ")})` : ""}`).join(" + ");
    await this.turn(
      `[EVENTO]${said} O barista entregou: ${desc}. Avaliação: accuracy ${r.accuracy}, problemas: ${r.issues.join("; ") || "nenhum"}. Reaja com a gorjeta na tag, ex: [feliz +5].`,
    );
  }

  dismiss(): void {
    this.agent?.close();
    this.agent = null;
    this.busy = false;
  }

  close(): void {
    this.dismiss();
    this.warmAgent?.close();
    this.warmAgent = null;
  }

  async handle(raw: string): Promise<void> {
    const parsed = ClientMsg.safeParse(JSON.parse(raw));
    if (!parsed.success) return this.send({ type: "error", message: "mensagem inválida" });
    const m = parsed.data;
    if (m.type === "hello") return this.init();
    if (m.type === "warm") return this.warm(m.customerId);
    if (m.type === "next") return this.next(m.customerId);
    if (m.type === "say") {
      // Voz/texto livre: "Prontinho! servir latte G" também entrega.
      const { speech, action } = splitAction(m.text);
      const items = action && this.menu ? parseServe(action, this.menu).items : [];
      if (items.length) return this.serve(items, speech);
      return this.turn(`Barista: "${m.text}"`);
    }
    if (m.type === "serve") return this.serve(m.items, m.text);
    if (m.type === "bye") return this.turn(`Barista: "Até logo!" [EVENTO] O barista encerrou o atendimento. Despeça-se e feche a conta.`);
  }
}

// ---------- HTTP estático ----------
const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".json": "application/json",
};

const http = createServer(async (req, res) => {
  const path = normalize(decodeURIComponent((req.url ?? "/").split("?")[0]!)).replace(/^[/\\]+/, "") || "index.html";
  const file = join(PUBLIC, path);
  if (!file.startsWith(PUBLIC)) return void res.writeHead(403).end();
  try {
    const body = await readFile(file);
    res.writeHead(200, { "content-type": MIME[extname(file)] ?? "application/octet-stream", "cache-control": "no-store" }).end(body);
  } catch {
    res.writeHead(404).end("not found");
  }
});

const wss = new WebSocketServer({ server: http, path: "/ws" });
wss.on("connection", (ws) => {
  const s = new Session(ws);
  ws.on("message", (data) => s.handle(String(data)).catch((e) => s.send({ type: "error", message: (e as Error).message })));
  ws.on("close", () => s.close());
});

http.listen(PORT, "127.0.0.1", () => console.log(`☕ Café Interativo em http://localhost:${PORT}`));
