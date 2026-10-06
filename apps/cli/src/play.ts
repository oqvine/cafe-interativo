// Jogo no terminal: você é o barista, o cliente é um `claude -p` headless.
// Este arquivo É o orquestrador: repassa falas, executa serve via MCP, mostra eventos.
//   npm run cliente -- dona-marta        (--debug mostra stderr do claude)
import { createInterface } from "node:readline/promises";
import { styleText } from "node:util";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { CustomerAgent, type Turn } from "@cafe/agents";
import type { MenuItem, Order } from "@cafe/shared";
import { parseServe, SERVE_RE } from "./parse.ts";

const args = process.argv.slice(2);
const debug = args.includes("--debug");
const customerId = args.find((a) => !a.startsWith("--")) ?? "dona-marta";

const dim = (s: string) => styleText("dim", s);
const EMOJI: Record<string, string> = {
  feliz: "😊", neutro: "😐", impaciente: "😤", irritado: "😠", confuso: "😕", encantado: "🤩",
};

// --- MCP client do orquestrador (o barista também fala MCP) ---
const MCP_ENTRY = fileURLToPath(new URL("../../../packages/mcp-cafe/src/index.ts", import.meta.url));
const mcp = new Client({ name: "cafe-cli", version: "0.1.0" });
await mcp.connect(new StdioClientTransport({ command: process.execPath, args: [MCP_ENTRY], stderr: "ignore" }));

async function call<T>(name: string, a: Record<string, unknown> = {}): Promise<T> {
  const r = await mcp.callTool({ name, arguments: a });
  const text = (r.content as { text: string }[])[0]?.text ?? "";
  if (r.isError) throw new Error(text);
  return JSON.parse(text) as T;
}

const menu = await call<MenuItem[]>("get_menu");

// --- agente-cliente ---
const agent = new CustomerAgent(customerId);
let closed = false;
let tokens = { input: 0, output: 0, cacheRead: 0 };

agent.on("tool", (name: string, input: unknown) => {
  const short = name.replace("mcp__cafe__", "");
  if (short === "close_order") closed = true;
  console.log(dim(`   ⚙ ${short} ${JSON.stringify(input)}`));
});
if (debug) agent.on("stderr", (l: string) => console.error(dim(`   [claude] ${l}`)));

function show(t: Turn): void {
  const name = customerId;
  const emo = t.emotion ? `${EMOJI[t.emotion] ?? ""} ${t.emotion}` : "?";
  console.log(`\n${styleText("bold", name)} ${dim(`(${emo})`)}: ${t.speech}`);
  tokens = { input: tokens.input + t.usage.input, output: tokens.output + t.usage.output, cacheRead: tokens.cacheRead + t.usage.cacheRead };
  console.log(dim(`   ⏱ ${(t.ms / 1000).toFixed(1)}s · in ${t.usage.input} · out ${t.usage.output} · cache ${t.usage.cacheRead}`));
}

async function say(text: string): Promise<Turn | null> {
  try {
    const t = await agent.send(text);
    show(t);
    return t;
  } catch (e) {
    const msg = (e as Error).message;
    console.error(styleText("red", `\n✖ ${msg}`));
    if (/login/i.test(msg)) console.error("  Rode `claude` no terminal, faça /login e tente de novo.");
    return null;
  }
}

async function serve(line: string): Promise<void> {
  const { items, unknown } = parseServe(line, menu);
  if (unknown.length) console.log(dim(`   ? não entendi: ${unknown.join(", ")} (itens: ${menu.map((m) => m.id).join(", ")})`));
  if (!items.length) return;

  const queue = await call<Order[]>("get_queue");
  const order = queue.filter((o) => o.customerId === customerId).at(-1);
  if (!order) {
    await say("[EVENTO] O barista quer entregar, mas você ainda não registrou o pedido.");
    return;
  }
  const r = await call<{ points: number; accuracy: number; issues: string[] }>("serve", { orderId: order.id, prepared: items });
  const desc = items.map((i) => `${i.itemId} ${i.size}${i.modifiers.length ? ` (${i.modifiers.join(", ")})` : ""}`).join(" + ");
  await say(
    `[EVENTO] O barista entregou: ${desc}. Avaliação: accuracy ${r.accuracy}, problemas: ${r.issues.join("; ") || "nenhum"}.`,
  );
  console.log(styleText("yellow", `   🎯 ${r.points} pts${r.issues.length ? " · " + r.issues.join(" · ") : " · perfeito"}`));
}

// --- loop ---
console.log(styleText("bold", "☕ Café Interativo — terminal"));
console.log(dim("Fale normalmente. 'servir latte G com canela' entrega. 'sair' encerra.\n"));
console.log(dim(`chamando ${customerId}…`));

const first = await say(`customerId: ${customerId}. Você acabou de entrar na cafeteria e chegou ao balcão. Diga sua primeira fala.`);
const rl = createInterface({ input: process.stdin, output: process.stdout });

while (first && !closed) {
  const line = (await rl.question(styleText("cyan", "\nvocê › "))).trim();
  if (!line) continue;
  if (/^(sair|exit|quit)$/i.test(line)) break;
  if (SERVE_RE.test(line)) await serve(line);
  else await say(`Barista: "${line}"`);
}

if (closed) {
  const s = await call<{ points: number; served: number; avgAccuracy: number | null }>("get_score");
  console.log(styleText("green", `\n✔ ${customerId} foi embora. Placar geral: ${s.points} pts · ${s.served} servidos`));
}
console.log(dim(`tokens da sessão: in ${tokens.input} · out ${tokens.output} · cache ${tokens.cacheRead}`));
rl.close();
agent.close();
await mcp.close();
