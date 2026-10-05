# Café Interativo

Jogo de barista: clientes são agentes Claude, voz no navegador. Projeto pessoal/acadêmico para aprender agentes + MCP.

## Restrições
- **Zero custo além da assinatura Claude.** Nada de API key Anthropic/OpenAI. Agentes-clientes rodam via `claude -p` (headless, login da assinatura). Voz = Web Speech API + speechSynthesis.
- GitHub: repo **público** (oqvine/cafe-interativo), projeto pessoal de estudo. Nunca commitar segredos, `.env` ou `data/*.db`.
- npm workspaces (sem pnpm).

## Stack
- Node 24 roda `.ts` direto (type stripping). Só sintaxe apagável: sem `enum`, sem `namespace`, sem parameter properties. Imports com extensão `.ts`.
- `tsc` (TS 7) só para checar tipos: `npm run typecheck`.
- Banco: `node:sqlite` em `data/cafe.db` (env `CAFE_DB` sobrescreve).

## Layout
- `packages/shared` — schemas Zod/tipos compartilhados.
- `packages/mcp-cafe` — MCP server `cafe` (tools/resources/prompts). Registrado em `.mcp.json` via stdio.
  - `server.ts` define tudo, `index.ts` = stdio, `smoke.ts` = cliente MCP em memória (teste).
  - stdio: **nunca** escrever em stdout; log via `console.error`.

## Claude Code (jogo dentro do chat)
- `.claude/agents/cliente.md` — subagent (Haiku) que interpreta 1 cliente; só tools de cliente.
- `.claude/skills/atender/` — `/atender <id>`: Claude principal orquestra (repassa falas, executa `serve`).
- `.claude/settings.json` — habilita server `cafe` e libera `mcp__cafe__*`.

## Comandos
- `npm run smoke` — teste ponta a ponta do MCP.
- `npm run seed` — popula cardápio e clientes.
- `npm run inspect` — MCP Inspector no navegador.

## Roadmap
0. ✅ monorepo + cafe-mcp
1. 1 cliente por texto
   - 1a ✅ subagent `cliente` + skill `/atender`
   - 1b script headless `claude -p` (precisa do CLI `claude` no PATH)
   - 1c `apps/server` com WebSocket
2. Voz MVP (push-to-talk)
3. Cena cartoon SVG + emoções
4. Director + fila + pontuação
5. Memória de recorrentes, VAD
