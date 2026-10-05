// Define o MCP server: tools (ações), resources (leitura), prompts (templates).
// Independente de transporte: index.ts liga em stdio, smoke.ts liga em memória.
import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { completable } from "@modelcontextprotocol/sdk/server/completable.js";
import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { Emotion, OrderItem, OrderStatus } from "@cafe/shared";
import { Repo } from "./db.ts";
import { compare, priceOf } from "./game.ts";

const json = (data: unknown) => ({
  content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
});

// Código -32002 = "Resource not found" na spec do MCP.
const RESOURCE_NOT_FOUND = -32002;

const jsonResource = (uri: URL, data: unknown) => ({
  contents: [{ uri: uri.href, mimeType: "application/json", text: JSON.stringify(data, null, 2) }],
});

const fail = (msg: string) => ({
  content: [{ type: "text" as const, text: msg }],
  isError: true,
});

export function buildServer(repo: Repo): McpServer {
  const server = new McpServer({ name: "cafe-mcp", version: "0.1.0" });
  const menuMap = () => new Map(repo.menu().map((m) => [m.id, m]));

  // Autocomplete (completion/complete): sugere ids de cliente que começam com o que foi digitado.
  const suggestCustomerIds = (typed = "") =>
    repo.customers().map((c) => c.id).filter((id) => id.startsWith(typed.toLowerCase()));
  const validIds = () => repo.customers().map((c) => c.id).join(", ");

  // ---------- TOOLS ----------

  server.registerTool(
    "get_menu",
    {
      title: "Ver cardápio",
      description: "Lista itens do cardápio com preços por tamanho (P/M/G).",
      annotations: { readOnlyHint: true },
    },
    async () => json(repo.menu()),
  );

  server.registerTool(
    "register_customer",
    {
      title: "Registrar cliente",
      description: "Cria ou atualiza um cliente (persona). Conta uma visita.",
      inputSchema: {
        id: z.string().regex(/^[a-z0-9-]+$/).describe("slug, ex: 'dona-marta'"),
        name: z.string(),
        archetype: z.string().describe("ex: apressado, indeciso, crítico gourmet"),
        persona: z.string().describe("descrição de personalidade em 2-4 frases"),
      },
    },
    async (c) => {
      const saved = repo.upsertCustomer(c);
      repo.addVisit(c.id);
      return json(repo.customer(saved.id));
    },
  );

  server.registerTool(
    "remember",
    {
      title: "Lembrar fato",
      description: "Guarda um fato sobre o cliente para visitas futuras (ex: 'barista errou meu leite').",
      inputSchema: { customerId: z.string(), fact: z.string().max(200) },
    },
    async ({ customerId, fact }) => {
      try {
        return json(repo.remember(customerId, fact).memory);
      } catch (e) {
        return fail((e as Error).message);
      }
    },
  );

  server.registerTool(
    "create_order",
    {
      title: "Fazer pedido",
      description: "Registra o pedido de um cliente. Retorna pedido com total calculado.",
      inputSchema: {
        customerId: z.string(),
        items: z.array(OrderItem).min(1),
        notes: z.string().default(""),
      },
    },
    async ({ customerId, items, notes }) => {
      if (!repo.customer(customerId)) return fail(`cliente '${customerId}' não existe; use register_customer`);
      try {
        const total = priceOf(items, menuMap());
        const order = repo.createOrder(customerId, items, notes, total);
        repo.logEvent("pedido", 0, { orderId: order.id });
        return json(order);
      } catch (e) {
        return fail((e as Error).message);
      }
    },
  );

  server.registerTool(
    "change_order",
    {
      title: "Alterar pedido",
      description: "Troca os itens de um pedido ainda aberto.",
      inputSchema: { orderId: z.number().int(), items: z.array(OrderItem).min(1) },
    },
    async ({ orderId, items }) => {
      const o = repo.order(orderId);
      if (!o) return fail(`pedido #${orderId} não existe`);
      if (o.status !== "aberto") return fail(`pedido #${orderId} já está '${o.status}'`);
      try {
        return json(repo.updateOrder(orderId, { items, total: priceOf(items, menuMap()) }));
      } catch (e) {
        return fail((e as Error).message);
      }
    },
  );

  server.registerTool(
    "get_queue",
    {
      title: "Fila",
      description: "Pedidos abertos ou em preparo, do mais antigo ao mais novo.",
      annotations: { readOnlyHint: true },
    },
    async () => json(repo.queue()),
  );

  server.registerTool(
    "serve",
    {
      title: "Servir",
      description:
        "Barista entrega o que preparou. Compara com o pedido, devolve accuracy (0-1) e problemas. Dá pontos.",
      inputSchema: { orderId: z.number().int(), prepared: z.array(OrderItem).min(1) },
    },
    async ({ orderId, prepared }) => {
      const o = repo.order(orderId);
      if (!o) return fail(`pedido #${orderId} não existe`);
      if (o.status !== "aberto" && o.status !== "preparando") return fail(`pedido #${orderId} já está '${o.status}'`);
      const diff = compare(o.items, prepared);
      const points = Math.round(diff.accuracy * 100);
      repo.updateOrder(orderId, { status: "servido", accuracy: diff.accuracy });
      repo.logEvent("servido", points, { orderId, ...diff });
      return json({ orderId, points, ...diff });
    },
  );

  server.registerTool(
    "react",
    {
      title: "Reação do cliente",
      description: "Cliente registra emoção (vira animação na UI). Pode dar gorjeta em pontos.",
      inputSchema: {
        customerId: z.string(),
        emotion: Emotion,
        tip: z.number().int().min(0).max(50).default(0),
      },
    },
    async ({ customerId, emotion, tip }) => {
      repo.logEvent("reacao", tip, { customerId, emotion });
      return json({ ok: true, customerId, emotion, tip });
    },
  );

  server.registerTool(
    "close_order",
    {
      title: "Fechar pedido",
      description: "Marca pedido como pago ou cancelado.",
      inputSchema: { orderId: z.number().int(), status: OrderStatus.extract(["pago", "cancelado"]) },
    },
    async ({ orderId, status }) => {
      try {
        const o = repo.updateOrder(orderId, { status });
        if (status === "cancelado") repo.logEvent("cancelado", -20, { orderId });
        return json(o);
      } catch (e) {
        return fail((e as Error).message);
      }
    },
  );

  server.registerTool(
    "get_score",
    {
      title: "Placar",
      description: "Pontos, cafés servidos, precisão média e faturamento.",
      annotations: { readOnlyHint: true },
    },
    async () => json(repo.score()),
  );

  // ---------- RESOURCES ----------
  // Recursos = dados que o cliente MCP lê sem "agir". Bom p/ contexto.

  server.registerResource(
    "menu",
    "cafe://menu",
    { title: "Cardápio", description: "Cardápio completo", mimeType: "application/json" },
    async (uri) => jsonResource(uri, repo.menu()),
  );

  server.registerResource(
    "session",
    "cafe://session",
    { title: "Sessão atual", description: "Fila + placar", mimeType: "application/json" },
    async (uri) => jsonResource(uri, { queue: repo.queue(), score: repo.score() }),
  );

  server.registerResource(
    "customer",
    new ResourceTemplate("cafe://customers/{id}", {
      list: async () => ({
        // title sobrescreve o "Cliente" genérico do metadata do template
        resources: repo.customers().map((c) => ({ uri: `cafe://customers/${c.id}`, name: c.id, title: c.name })),
      }),
      complete: { id: (typed) => suggestCustomerIds(typed) },
    }),
    { title: "Cliente", description: "Persona + memória de um cliente", mimeType: "application/json" },
    async (uri, { id }) => {
      const c = repo.customer(String(id));
      if (!c) throw new McpError(RESOURCE_NOT_FOUND, `cliente '${id}' não existe. ids válidos: ${validIds()}`);
      return jsonResource(uri, c);
    },
  );

  // ---------- PROMPTS ----------
  // Prompt = template reutilizável. Vira o system prompt de cada agente-cliente.

  // Texto único da persona: usado pelo prompt (clientes MCP genéricos) e pela tool
  // get_persona (subagents do Claude Code, que só enxergam tools).
  const customerBrief = (customerId: string): string => {
    const c = repo.customer(customerId);
    // Cliente novo? Cadastre antes com register_customer. Erro claro > persona inventada por engano.
    if (!c) throw new McpError(ErrorCode.InvalidParams, `cliente '${customerId}' não existe. ids válidos: ${validIds()}`);
    return `Você é ${c.name} (${c.archetype}) [id: ${c.id}]. ${c.persona}
Visitas anteriores: ${c.visits}.
Memórias: ${c.memory.join("; ") || "nenhuma"}.

Você está numa cafeteria falando com o barista (o jogador). Regras:
- Fale em português, curto (1-2 frases), como gente de verdade falando em voz alta.
- Mantenha a personalidade o tempo todo.
- Quando decidir o pedido, chame create_order (consulte get_menu se precisar).
- Ao receber o café, avalie o resultado do serve e reaja com react (emoção + gorjeta coerente).
- Se algo marcante acontecer, use remember para lembrar na próxima visita.
- Ao final, chame close_order com 'pago' (ou 'cancelado' se desistir).`;
  };

  server.registerTool(
    "get_persona",
    {
      title: "Ver persona",
      description: "Persona, memórias e regras de comportamento de um cliente. Chame antes de interpretá-lo.",
      inputSchema: { customerId: z.string() },
      annotations: { readOnlyHint: true },
    },
    async ({ customerId }) => {
      try {
        return { content: [{ type: "text" as const, text: customerBrief(customerId) }] };
      } catch (e) {
        return fail((e as Error).message);
      }
    },
  );

  server.registerPrompt(
    "play_customer",
    {
      title: "Interpretar cliente",
      description: "Instruções para um agente interpretar um cliente da cafeteria.",
      argsSchema: {
        customerId: completable(z.string().describe("id do cliente, ex: dona-marta"), (typed) => suggestCustomerIds(typed)),
      },
    },
    async ({ customerId }) => ({
      messages: [{ role: "user", content: { type: "text", text: customerBrief(customerId) } }],
    }),
  );

  return server;
}
