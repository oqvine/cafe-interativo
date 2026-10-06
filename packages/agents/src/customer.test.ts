import { test } from "node:test";
import assert from "node:assert/strict";
import { parseLine } from "./customer.ts";

test("emoção simples", () => {
  assert.deepEqual(parseLine("[feliz] Oi, querido!"), { emotion: "feliz", tip: null, speech: "Oi, querido!" });
});

test("emoção com gorjeta", () => {
  assert.deepEqual(parseLine("[encantado +8] Magnifique!"), { emotion: "encantado", tip: 8, speech: "Magnifique!" });
});

test("gorjeta limitada a 50", () => {
  assert.equal(parseLine("[feliz +999] Valeu!")?.tip, 50);
});

test("ignora comentário de bastidor depois da fala", () => {
  const raw = "[feliz] Que delícia!\nJá respondi como Dona Marta! Aguardando o próximo evento.";
  assert.equal(parseLine(raw)?.speech, "Que delícia!");
});

test("sem tag → null", () => {
  assert.equal(parseLine("Já respondi como Dona Marta!"), null);
});

test("emoção desconhecida vira null, fala preservada", () => {
  assert.deepEqual(parseLine("[sonolento] Bom dia…"), { emotion: null, tip: null, speech: "Bom dia…" });
});
