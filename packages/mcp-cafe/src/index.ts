// Entry point stdio. É assim que o Claude Code (via .mcp.json) sobe o server.
// ATENÇÃO: em stdio, stdout é o canal do protocolo. Log só em stderr (console.error).
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { openDb, Repo } from "./db.ts";
import { seed } from "./seed.ts";
import { buildServer } from "./server.ts";

const repo = new Repo(openDb());
if (repo.menu().length === 0) seed(repo);

const server = buildServer(repo);
await server.connect(new StdioServerTransport());
console.error("cafe-mcp rodando (stdio)");
