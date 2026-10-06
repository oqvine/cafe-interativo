// node --test: roda com `npm test`
import { test } from "node:test";
import assert from "node:assert/strict";
import type { MenuItem } from "@cafe/shared";
import { parseServe, splitAction } from "./parse.ts";

const menu: MenuItem[] = [
  { id: "latte", name: "Latte", description: "", prices: { P: 1, M: 1, G: 1 } },
  { id: "cold-brew", name: "Cold Brew", description: "", prices: { P: 1, M: 1, G: 1 } },
  { id: "pao-de-queijo", name: "Pão de Queijo", description: "", prices: { P: 1, M: 1, G: 1 } },
];

test("item simples com tamanho padrão M", () => {
  assert.deepEqual(parseServe("servir latte", menu).items, [{ itemId: "latte", size: "M", modifiers: [] }]);
});

test("tamanho, modificadores e acento", () => {
  const { items } = parseServe("servir Cold Brew grande com gelo e extra shot, sem acucar", menu);
  assert.equal(items[0]!.itemId, "cold-brew");
  assert.equal(items[0]!.size, "G");
  assert.deepEqual([...items[0]!.modifiers].sort(), ["extra shot", "gelo", "sem açúcar"]);
});

test("vários itens com +", () => {
  const { items } = parseServe("toma latte P com canela + pão de queijo G", menu);
  assert.deepEqual(items, [
    { itemId: "latte", size: "P", modifiers: ["canela"] },
    { itemId: "pao-de-queijo", size: "G", modifiers: [] },
  ]);
});

test("item desconhecido", () => {
  assert.deepEqual(parseServe("servir frappuccino", menu).unknown, ["frappuccino"]);
});

test("fala + ação na mesma linha", () => {
  assert.deepEqual(splitAction("Tem sim chefe. servir latte G com canela"), {
    speech: "Tem sim chefe.",
    action: "servir latte G com canela",
  });
  assert.deepEqual(splitAction("servir latte"), { speech: "", action: "servir latte" });
  assert.deepEqual(splitAction("ele toma café todo dia"), { speech: "ele toma café todo dia", action: null });
  assert.deepEqual(splitAction("posso te servir algo?"), { speech: "posso te servir algo?", action: null });
  assert.deepEqual(splitAction("Prontinho! Entregar mocha P"), { speech: "Prontinho!", action: "Entregar mocha P" });
});
