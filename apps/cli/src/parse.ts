// "servir latte G com canela e extra shot + pão de queijo P" → OrderItem[]
// Parser determinístico: o orquestrador em código não gasta token para entender o barista.
import { Modifier, type MenuItem, type OrderItem, type Size } from "@cafe/shared";

const norm = (s: string) =>
  s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/\s+/g, " ").trim();

const SIZE_WORDS: [RegExp, Size][] = [
  [/\b(p|pequeno|pequena)\b/, "P"],
  [/\b(m|medio|media)\b/, "M"],
  [/\b(g|grande)\b/, "G"],
];

export const SERVE_RE = /^\s*(servir|entregar|toma)\b\s*/i;

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
