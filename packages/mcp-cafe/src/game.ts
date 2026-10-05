// Regras puras do jogo (sem I/O). Fácil de testar.
import type { MenuItem, Modifier, OrderItem } from "@cafe/shared";

const SURCHARGE: Partial<Record<Modifier, number>> = {
  "extra shot": 3,
  "leite de aveia": 2,
  chantilly: 2,
  caramelo: 2,
};

export function priceOf(items: OrderItem[], menu: Map<string, MenuItem>): number {
  let total = 0;
  for (const it of items) {
    const m = menu.get(it.itemId);
    if (!m) throw new Error(`item '${it.itemId}' não está no cardápio`);
    total += m.prices[it.size];
    for (const mod of it.modifiers) total += SURCHARGE[mod] ?? 0;
  }
  return Math.round(total * 100) / 100;
}

function itemScore(want: OrderItem, got: OrderItem): number {
  if (want.itemId !== got.itemId) return 0;
  const a = new Set(want.modifiers);
  const b = new Set(got.modifiers);
  const union = new Set([...a, ...b]);
  const inter = [...a].filter((m) => b.has(m)).length;
  const mods = union.size === 0 ? 1 : inter / union.size;
  return 0.5 + (want.size === got.size ? 0.25 : 0) + 0.25 * mods;
}

export type ServeDiff = { accuracy: number; issues: string[] };

/** Compara o pedido com o que o barista fez. 1 = perfeito. Itens a mais/menos penalizam. */
export function compare(ordered: OrderItem[], served: OrderItem[]): ServeDiff {
  const pool = [...served];
  const issues: string[] = [];
  let sum = 0;
  for (const want of ordered) {
    let best = -1;
    let bestScore = 0;
    pool.forEach((got, i) => {
      const s = itemScore(want, got);
      if (s > bestScore) [best, bestScore] = [i, s];
    });
    if (best < 0) {
      issues.push(`faltou ${want.itemId} ${want.size}`);
      continue;
    }
    const got = pool.splice(best, 1)[0]!;
    if (got.size !== want.size) issues.push(`${want.itemId}: tamanho ${got.size}, pediu ${want.size}`);
    const missing = want.modifiers.filter((m) => !got.modifiers.includes(m));
    const extra = got.modifiers.filter((m) => !want.modifiers.includes(m));
    if (missing.length) issues.push(`${want.itemId}: faltou ${missing.join(", ")}`);
    if (extra.length) issues.push(`${want.itemId}: veio ${extra.join(", ")} sem pedir`);
    sum += bestScore;
  }
  for (const got of pool) issues.push(`veio ${got.itemId} que ninguém pediu`);
  const denom = Math.max(ordered.length, served.length, 1);
  return { accuracy: Math.round((sum / denom) * 100) / 100, issues };
}
