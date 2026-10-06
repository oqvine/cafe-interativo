// CustomerAgent: um cliente = um processo `claude -p` vivo, falando stream-json.
// Usa o login da assinatura (sem API key). O seu código vira o orquestrador.
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { EventEmitter } from "node:events";
import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import { Emotion, type MenuItem } from "@cafe/shared";

const ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const AGENT_FILE = `${ROOT}.claude/agents/cliente.md`;
const MCP_ENTRY = `${ROOT}packages/mcp-cafe/src/index.ts`;

// Tools do barista: escondidas do cliente para ele não "trapacear".
const BARISTA_TOOLS = ["serve", "get_queue", "get_score", "register_customer"].map((t) => `mcp__cafe__${t}`);

export type AgentDef = { systemPrompt: string; tools: string[]; model: string };

/** Lê o mesmo .md do subagent do Claude Code: uma fonte só para os dois modos. */
export function loadAgentDef(path = AGENT_FILE): AgentDef {
  const raw = readFileSync(path, "utf8").replace(/\r\n/g, "\n");
  const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) throw new Error(`frontmatter inválido em ${path}`);
  const fm = m[1]!;
  const tools = (fm.match(/^tools:\s*(.+)$/m)?.[1] ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const model = fm.match(/^model:\s*(.+)$/m)?.[1]?.trim() ?? "haiku";
  return { systemPrompt: m[2]!.trim(), tools, model };
}

export type Usage = { input: number; output: number; cacheRead: number; cacheWrite: number };

export type Turn = {
  raw: string; // texto completo do modelo
  emotion: Emotion | null;
  speech: string; // fala sem a tag de emoção
  tip: number | null; // gorjeta escrita na tag: "[encantado +5]" (modo headless, sem tool react)
  tools: { name: string; input: unknown }[];
  usage: Usage;
  ms: number;
};

type Pending = {
  resolve: (t: Turn) => void;
  reject: (e: Error) => void;
  texts: string[];
  tools: Turn["tools"];
  spoke?: Line; // fala já emitida neste turno
};

/**
 * Eventos:
 *  - "ready"  (init)              processo subiu, MCP conectado
 *  - "speech" (Line)              fala pronta — antes do turno acabar (tools ainda rodando)
 *  - "tool"   (name, input)       cliente chamou uma tool (ex: create_order)
 *  - "stderr" (line)              saída de erro do claude
 *  - "exit"   (code)
 */
export class CustomerAgent extends EventEmitter {
  readonly customerId: string;
  readonly def: AgentDef;
  #proc: ChildProcessWithoutNullStreams | null = null;
  #pending: Pending | null = null;

  /**
   * inlineReact: a reação vem na própria fala ("[feliz +3] ...") e o orquestrador registra.
   * Economiza uma ida ao modelo por entrega. A tool `react` fica bloqueada.
   */
  readonly inlineReact: boolean;

  constructor(customerId: string, opts: { def?: AgentDef; inlineReact?: boolean } = {}) {
    super();
    this.customerId = customerId;
    this.def = opts.def ?? loadAgentDef();
    this.inlineReact = opts.inlineReact ?? true;
  }

  /** Sobe o processo já (sem mandar mensagem = sem gastar token). Útil para pré-aquecer. */
  warm(): this {
    if (!this.#proc) this.start();
    return this;
  }

  start(): void {
    const mcpConfig = JSON.stringify({
      mcpServers: { cafe: { command: process.execPath, args: [MCP_ENTRY] } },
    });
    const args = [
      "-p",
      "--input-format", "stream-json",
      "--output-format", "stream-json",
      "--verbose", // obrigatório com stream-json
      "--model", this.def.model,
      "--system-prompt", this.def.systemPrompt, // substitui o prompt gigante do Claude Code
      "--tools", "", // sem Bash/Read/Edit…
      "--mcp-config", mcpConfig,
      "--strict-mcp-config", // ignora outros MCPs do usuário
      "--allowedTools", this.def.tools.join(","),
      "--disallowedTools", [...BARISTA_TOOLS, ...(this.inlineReact ? ["mcp__cafe__react"] : [])].join(","),
      "--permission-mode", "dontAsk", // o que não está liberado é negado, sem perguntar
      "--no-session-persistence",
    ];
    // cwd fora do projeto: evita carregar CLAUDE.md e .claude/ (contexto à toa = token à toa)
    const proc = spawn(process.env.CLAUDE_BIN ?? "claude", args, { cwd: tmpdir(), stdio: ["pipe", "pipe", "pipe"] });
    this.#proc = proc;

    createInterface({ input: proc.stdout }).on("line", (line) => this.#onLine(line));
    createInterface({ input: proc.stderr }).on("line", (line) => this.emit("stderr", line));
    proc.on("exit", (code) => {
      this.#pending?.reject(new Error(`claude saiu (código ${code})`));
      this.#pending = null;
      this.emit("exit", code);
    });
    proc.on("error", (err) => {
      this.#pending?.reject(err);
      this.#pending = null;
    });
  }

  /** Manda uma mensagem e resolve quando o turno do cliente termina (evento "result"). */
  send(text: string): Promise<Turn> {
    if (!this.#proc) this.start();
    if (this.#pending) return Promise.reject(new Error("turno anterior ainda em andamento"));
    const started = Date.now();
    return new Promise<Turn>((resolve, reject) => {
      this.#pending = {
        resolve: (t) => resolve({ ...t, ms: Date.now() - started }),
        reject,
        texts: [],
        tools: [],
      };
      const msg = { type: "user", message: { role: "user", content: text } };
      this.#proc!.stdin.write(JSON.stringify(msg) + "\n");
    });
  }

  close(): void {
    this.#proc?.stdin.end();
  }

  #onLine(line: string): void {
    let e: any;
    try {
      e = JSON.parse(line);
    } catch {
      return; // linha não-JSON: ignora
    }
    const p = this.#pending;
    switch (e.type) {
      case "system":
        if (e.subtype === "init") this.emit("ready", e);
        break;
      case "assistant":
        for (const c of e.message?.content ?? []) {
          if (c.type === "text") {
            p?.texts.push(c.text);
            // Fala sai assim que chega: tools (create_order…) terminam em segundo plano.
            const line = p && !p.spoke ? parseLine(c.text) : null;
            if (p && line) {
              p.spoke = line;
              this.emit("speech", line);
            }
          }
          if (c.type === "tool_use") {
            p?.tools.push({ name: c.name, input: c.input });
            this.emit("tool", c.name, c.input);
          }
        }
        break;
      case "result": {
        if (!p) break;
        this.#pending = null;
        const raw = p.texts.join("\n").trim() || String(e.result ?? "");
        if (e.is_error || /not logged in|please run \/login/i.test(raw)) {
          p.reject(new Error(raw || "erro no turno"));
          break;
        }
        const line = p.spoke ?? parseLine(raw) ?? { emotion: null, tip: null, speech: raw.split("\n").filter((l) => l.trim()).at(-1) ?? "" };
        const u = e.usage ?? {};
        p.resolve({
          raw,
          ...line,
          tools: p.tools,
          usage: {
            input: u.input_tokens ?? 0,
            output: u.output_tokens ?? 0,
            cacheRead: u.cache_read_input_tokens ?? 0,
            cacheWrite: u.cache_creation_input_tokens ?? 0,
          },
          ms: 0,
        });
        break;
      }
    }
  }
}

export type Line = { emotion: Emotion | null; tip: number | null; speech: string };

/**
 * Acha a PRIMEIRA linha "[emoção] fala" ou "[emoção +gorjeta] fala".
 * Primeira, porque comentários de bastidor costumam vir depois.
 */
export function parseLine(text: string): Line | null {
  for (const l of text.split("\n")) {
    const m = l.match(/^\s*\[([^\]]+)\]\s*(.+)$/);
    if (!m) continue;
    const tag = m[1]!.trim().toLowerCase().match(/^([a-zà-ú]+)\s*(?:\+\s*(\d+))?/);
    const emo = tag ? Emotion.safeParse(tag[1]) : null;
    return {
      emotion: emo?.success ? emo.data : null,
      tip: tag?.[2] !== undefined ? Math.min(50, Number(tag[2])) : null,
      speech: m[2]!.trim(),
    };
  }
  return null;
}

/**
 * Primeira mensagem já com persona + cardápio: o cliente não precisa chamar
 * get_persona/get_menu (2 idas ao modelo a menos → chegada bem mais rápida).
 */
export function openingMessage(customerId: string, persona: string, menu: MenuItem[]): string {
  const cardapio = menu
    .map((m) => `- ${m.id} (${m.name}): P ${m.prices.P} · M ${m.prices.M} · G ${m.prices.G}`)
    .join("\n");
  return `customerId: ${customerId}

## Persona (já carregada, não chame get_persona)
${persona}

## Cardápio (ids válidos, não chame get_menu)
${cardapio}

## Neste modo
Não existe a tool react. Ao reagir a um café servido, ponha a gorjeta (0-50) na tag: \`[encantado +8] fala\`.
Fora isso, a tag é só a emoção: \`[neutro] fala\`.

Você acabou de entrar na cafeteria e chegou ao balcão. Diga sua primeira fala.`;
}
