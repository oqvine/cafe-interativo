// Teste ponta a ponta: um CLIENTE MCP fala com o server em memória.
// É o mesmo papel que o Claude Code faz, só que em código. Roda: npm run smoke
import assert from "node:assert/strict";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { openDb, Repo } from "./db.ts";
import { seed } from "./seed.ts";
import { buildServer } from "./server.ts";

const repo = new Repo(openDb(":memory:"));
seed(repo);

const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
await buildServer(repo).connect(serverSide);
const client = new Client({ name: "smoke", version: "0" });
await client.connect(clientSide);

const call = async (name: string, args: Record<string, unknown> = {}) => {
  const r = await client.callTool({ name, arguments: args });
  const text = (r.content as { text: string }[])[0]!.text;
  if (r.isError) throw new Error(`${name}: ${text}`);
  return JSON.parse(text);
};

const { tools } = await client.listTools();
console.log("tools:", tools.map((t) => t.name).join(", "));

const order = await call("create_order", {
  customerId: "rafa-startup",
  items: [{ itemId: "cold-brew", size: "G", modifiers: ["extra shot", "gelo"] }],
});
assert.equal(order.total, 19);
console.log(`pedido #${order.id} total R$${order.total}`);

const result = await call("serve", {
  orderId: order.id,
  prepared: [{ itemId: "cold-brew", size: "M", modifiers: ["gelo"] }],
});
console.log("serve:", result);
assert.ok(result.accuracy < 1 && result.issues.length === 2);

await call("react", { customerId: "rafa-startup", emotion: "impaciente" });
await call("remember", { customerId: "rafa-startup", fact: "barista errou tamanho e esqueceu o extra shot" });
await assert.rejects(call("close_order", { orderId: order.id, status: "pago" }), /memory/); // sem memória não fecha
await call("close_order", { orderId: order.id, status: "pago", memory: "barista Tilam errou o tamanho" });
const rafa = await client.readResource({ uri: "cafe://customers/rafa-startup" });
const rafaData = JSON.parse((rafa.contents[0] as { text: string }).text);
assert.equal(rafaData.visits, 1);
assert.ok(rafaData.memory.includes("barista Tilam errou o tamanho"));

const prompt = await client.getPrompt({ name: "play_customer", arguments: { customerId: "rafa-startup" } });
assert.match((prompt.messages[0]!.content as { text: string }).text, /esqueceu o extra shot/);

const res = await client.readResource({ uri: "cafe://customers/rafa-startup" });
console.log("resource customer:", (res.contents[0] as { text: string }).text.slice(0, 80), "…");

await assert.rejects(client.readResource({ uri: "cafe://customers/dona_marta" }), /não existe/);
await assert.rejects(client.getPrompt({ name: "play_customer", arguments: { customerId: "xyz" } }), /não existe/);

// autocomplete: digitar "d" deve sugerir dona-marta
const comp = await client.complete({
  ref: { type: "ref/prompt", name: "play_customer" },
  argument: { name: "customerId", value: "d" },
});
assert.deepEqual(comp.completion.values, ["dona-marta"]);
console.log("autocomplete 'd' →", comp.completion.values);

console.log("score:", await call("get_score"));
console.log("\nSMOKE OK");
await client.close();
