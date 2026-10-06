# Café Interativo

Simulador de barista em que cada cliente é um agente de IA com personalidade própria.

> **Projeto pessoal de estudo.** Este repositório existe só para aprender orquestração de agentes de IA, MCP (Model Context Protocol), tool use e integração de voz. Não é um produto, não tem suporte e pode mudar ou quebrar a qualquer momento. Código público apenas como registro de aprendizado.

## O que estou estudando aqui

- **Orquestração de agentes**: um agente "diretor" coordenando vários agentes-clientes, cada um com persona e memória próprias.
- **MCP server próprio**: tools, resources, resource templates, prompts e autocomplete, consumidos pelo Claude Code e por clientes em código.
- **Tool use**: agentes que agem no estado do jogo (pedir, reagir, lembrar, pagar) em vez de só gerar texto.
- **Agentes headless**: clientes rodando como `claude -p`, sem chave de API separada.
- **Voz no navegador**: Web Speech API e speechSynthesis (fases futuras).

## Problema

Aprender agentes e MCP na prática exige um domínio com estado, regras e conversa. Uma cafeteria oferece isso: pedidos, preparo, avaliação e clientes que lembram de você.

## Stack

- Node.js 24 (TypeScript executado direto via type stripping)
- TypeScript 7 (só checagem de tipos)
- `@modelcontextprotocol/sdk` 1.32 + Zod 4
- `node:sqlite` (banco embutido)
- npm workspaces

## Como rodar

```bash
npm install
npm run cliente -- dona-marta   # joga no terminal (requer CLI `claude` logado)
npm test           # testes unitários
npm run smoke      # teste ponta a ponta do MCP server
npm run inspect    # MCP Inspector no navegador
npm run seed       # popula cardápio e clientes
npm run typecheck
```

No Claude Code, o server `cafe` é registrado por `.mcp.json`. Para jogar no chat: abra uma sessão na pasta e rode `/atender dona-marta`.

## Estrutura

```
apps/
  cli/         jogo no terminal (orquestrador em código)
packages/
  agents/      CustomerAgent: cliente = processo `claude -p` em stream-json
  shared/      contratos Zod (pedido, tamanho, emoção…)
  mcp-cafe/    MCP server: tools, resources, prompts
    src/server.ts   definição do server
    src/game.ts     preço e nota do café servido
    src/db.ts       SQLite
    src/index.ts    entrada stdio
    src/smoke.ts    cliente MCP de teste
.claude/
  agents/cliente.md       subagent que interpreta um cliente
  skills/atender/         /atender: orquestra o atendimento no chat
data/          banco local (ignorado pelo git)
```

## Status

Em desenvolvimento. Fase 0 (MCP server) e fase 1a/1b (cliente no chat do Claude Code e no terminal) concluídas. Próximo: clientes como agentes conversando por texto, depois voz e cena cartoon.
