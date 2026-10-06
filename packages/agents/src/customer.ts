// CustomerAgent: um cliente = um processo `claude -p` vivo, falando stream-json.
// Usa o login da assinatura (sem API key). O seu código vira o orquestrador.
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { EventEmitter } from "node:events";
import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import { Emotion } from "@cafe/shared";

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
  tools: { name: string; input: unknown }[];
  usage: Usage;
  ms: number;
};

type Pending = { resolve: (t: Turn) => void; reject: (e: Error) => void; texts: string[]; tools: Turn["tools"] };

/**
 * Eventos:
 *  - "ready"  (init)              processo subiu, MCP conectado
 *  - "tool"   (name, input)       cliente chamou uma tool (ex: create_order)
 *  - "stderr" (line)              saída de erro do claude
 *  - "exit"   (code)
 */
export class CustomerAgent extends EventEmitter {
  readonly customerId: string;
  readonly def: AgentDef;
  #proc: ChildProcessWithoutNullStreams | null = null;
  #pending: Pending | null = null;

  constructor(customerId: string, def = loadAgentDef()) {
    super();
    this.customerId = customerId;
    this.def = def;
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
      "--disallowedTools", BARISTA_TOOLS.join(","),
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
          if (c.type === "text") p?.texts.push(c.text);
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
        // A última linha não vazia é a fala (o modelo pode ter "pensado alto" antes).
        const last = raw.split("\n").filter((l) => l.trim()).at(-1) ?? "";
        const m = last.match(/^\s*\[([^\]]+)\]\s*(.*)$/s);
        const emo = m ? Emotion.safeParse(m[1]!.trim().toLowerCase()) : null;
        const u = e.usage ?? {};
        p.resolve({
          raw,
          emotion: emo?.success ? emo.data : null,
          speech: m ? m[2]!.trim() : last.trim(),
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
