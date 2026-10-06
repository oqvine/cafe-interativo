// "servir latte G com canela e extra shot + pão de queijo P" → OrderItem[]
// Parser determinístico: o orquestrador em código não gasta token para entender o barista.
import { Modifier, type MenuItem, type OrderItem, type Size } from "./index.ts";

const norm = (s: string) =>
  s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/\s+/g, " ").trim();

const SIZE_WORDS: [RegExp, Size][] = [
  [/\b(p|pequeno|pequena)\b/, "P"],
  [/\b(m|medio|media)\b/, "M"],
  [/\b(g|grande)\b/, "G"],
];

export const SERVE_RE = /^\s*(servir|entregar|toma)\b\s*/i;

/**
 * Separa fala de ação: "Tem sim, chefe. servir latte G" → { speech: "Tem sim, chefe.", action: "servir latte G" }.
 * No meio da linha só vale "servir"/"entregar" começando uma frase nova (após . ! ? ; :).
 * "posso te servir algo?" continua sendo fala. "toma" só no início (comum demais em fala).
 */
export function splitAction(line: string): { speech: string; action: string | null } {
  if (SERVE_RE.test(line)) return { speech: "", action: line.trim() };
  const m = line.match(/([.!?;:]\s*)(servir|entregar)\b/i);
  if (!m || m.index === undefined) return { speech: line.trim(), action: null };
  const at = m.index + m[1]!.length;
  return { speech: line.slice(0, at).trim(), action: line.slice(at).trim() };
}

export function parseServe(text: string, menu: MenuItem[]): { items: OrderItem[]; unknown: string[] } {
  const body = norm(text.replace(SERVE_RE, ""));
  const items: OrderItem[] = [];
  const unknown: string[] = [];
  // nomes mais longos primeiro: "cold brew" antes de "brew"
  const byName = [...menu].sort((a, b) => b.name.length - a.name.length);
  const mods = [...Modifier.options].sort((a, b) => b.length - a.length);

  for (const chunk of body.split(/\s*[+;]\s*/).filter(Boolean)) {
    let rest = ` ${chunk} `;
    const item = byName.find((m) => rest.includes(norm(m.name)) || rest.includes(m.id));
    if (!item) {
      unknown.push(chunk);
      continue;
    }
    rest = rest.replace(norm(item.name), " ").replace(item.id, " ");

    const modifiers: Modifier[] = [];
    for (const mod of mods) {
      const key = norm(mod);
      if (rest.includes(key)) {
        modifiers.push(mod);
        rest = rest.replace(key, " ");
      }
    }
    const size = SIZE_WORDS.find(([re]) => re.test(rest))?.[1] ?? "M";
    items.push({ itemId: item.id, size, modifiers });
  }
  return { items, unknown };
}
