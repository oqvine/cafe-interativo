// Dados iniciais. Roda sozinho (npm run seed) ou é chamado pelo index se o banco estiver vazio.
import type { MenuItem } from "@cafe/shared";
import { openDb, Repo } from "./db.ts";

const MENU: MenuItem[] = [
  { id: "espresso", name: "Espresso", description: "Curto e intenso.", prices: { P: 6, M: 8, G: 10 } },
  { id: "latte", name: "Latte", description: "Espresso com bastante leite vaporizado.", prices: { P: 9, M: 12, G: 15 } },
  { id: "cappuccino", name: "Cappuccino", description: "Espresso, leite e espuma.", prices: { P: 9, M: 12, G: 14 } },
  { id: "mocha", name: "Mocha", description: "Latte com chocolate.", prices: { P: 11, M: 14, G: 17 } },
  { id: "cold-brew", name: "Cold Brew", description: "Extração a frio, 18h.", prices: { P: 10, M: 13, G: 16 } },
  { id: "cha-mate", name: "Chá Mate", description: "Gelado, com limão.", prices: { P: 6, M: 8, G: 10 } },
  { id: "pao-de-queijo", name: "Pão de Queijo", description: "Porção.", prices: { P: 5, M: 8, G: 12 } },
];

const CUSTOMERS = [
  {
    id: "dona-marta",
    name: "Dona Marta",
    archetype: "avó carinhosa e conversadeira",
    persona: "Aposentada, vem todo dia, adora contar dos netos. Pede devagar e muda de ideia. Elogia muito quando acerta.",
  },
  {
    id: "rafa-startup",
    name: "Rafa",
    archetype: "apressado de startup",
    persona: "Fundador de startup, sempre no celular, fala rápido com jargão. Odeia esperar. Pede cold brew G com extra shot.",
  },
  {
    id: "chef-lucien",
    name: "Lucien",
    archetype: "crítico gourmet",
    persona: "Chef francês exigente. Faz perguntas sobre origem do grão. Nota cada erro, mas reconhece excelência.",
  },
];

export function seed(repo: Repo): void {
  for (const m of MENU) repo.upsertMenuItem(m);
  for (const c of CUSTOMERS) repo.upsertCustomer(c);
}

if (import.meta.main) {
  const repo = new Repo(openDb());
  seed(repo);
  console.log(`seed ok: ${repo.menu().length} itens, ${repo.customers().length} clientes`);
}
