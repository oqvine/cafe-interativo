// Camada de dados. node:sqlite (embutido no Node 24), síncrono.
import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { Customer, MenuItem, Order, OrderItem, OrderStatus } from "@cafe/shared";

const DEFAULT_PATH = fileURLToPath(new URL("../../../data/cafe.db", import.meta.url));

export function openDb(path = process.env.CAFE_DB ?? DEFAULT_PATH): DatabaseSync {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS menu_items (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      prices TEXT NOT NULL            -- JSON {P,M,G}
    );
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      archetype TEXT NOT NULL,
      persona TEXT NOT NULL,
      visits INTEGER NOT NULL DEFAULT 0,
      memory TEXT NOT NULL DEFAULT '[]' -- JSON string[]
    );
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id TEXT NOT NULL REFERENCES customers(id),
      items TEXT NOT NULL,            -- JSON OrderItem[]
      status TEXT NOT NULL DEFAULT 'aberto',
      notes TEXT NOT NULL DEFAULT '',
      total REAL NOT NULL DEFAULT 0,
      accuracy REAL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ts TEXT NOT NULL DEFAULT (datetime('now')),
      type TEXT NOT NULL,
      points INTEGER NOT NULL DEFAULT 0,
      payload TEXT NOT NULL DEFAULT '{}'
    );
  `);
  return db;
}

type Row = Record<string, unknown>;

const toMenuItem = (r: Row): MenuItem => ({
  id: r.id as string,
  name: r.name as string,
  description: r.description as string,
  prices: JSON.parse(r.prices as string),
});

const toCustomer = (r: Row): Customer => ({
  id: r.id as string,
  name: r.name as string,
  archetype: r.archetype as string,
  persona: r.persona as string,
  visits: r.visits as number,
  memory: JSON.parse(r.memory as string),
});

const toOrder = (r: Row): Order => ({
  id: r.id as number,
  customerId: r.customer_id as string,
  items: JSON.parse(r.items as string),
  status: r.status as OrderStatus,
  notes: r.notes as string,
  total: r.total as number,
  accuracy: (r.accuracy as number | null) ?? null,
  createdAt: r.created_at as string,
});

export class Repo {
  // sem "parameter property": type stripping do Node não aceita
  readonly db: DatabaseSync;
  constructor(db: DatabaseSync) {
    this.db = db;
  }

  // --- cardápio ---
  menu(): MenuItem[] {
    return this.db.prepare("SELECT * FROM menu_items ORDER BY name").all().map(toMenuItem);
  }
  menuItem(id: string): MenuItem | undefined {
    const r = this.db.prepare("SELECT * FROM menu_items WHERE id = ?").get(id);
    return r ? toMenuItem(r) : undefined;
  }
  upsertMenuItem(m: MenuItem): void {
    this.db
      .prepare(
        `INSERT INTO menu_items (id, name, description, prices) VALUES (?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET name=excluded.name, description=excluded.description, prices=excluded.prices`,
      )
      .run(m.id, m.name, m.description, JSON.stringify(m.prices));
  }

  // --- clientes ---
  customers(): Customer[] {
    return this.db.prepare("SELECT * FROM customers ORDER BY name").all().map(toCustomer);
  }
  customer(id: string): Customer | undefined {
    const r = this.db.prepare("SELECT * FROM customers WHERE id = ?").get(id);
    return r ? toCustomer(r) : undefined;
  }
  upsertCustomer(c: Omit<Customer, "visits" | "memory">): Customer {
    this.db
      .prepare(
        `INSERT INTO customers (id, name, archetype, persona) VALUES (?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET name=excluded.name, archetype=excluded.archetype, persona=excluded.persona`,
      )
      .run(c.id, c.name, c.archetype, c.persona);
    return this.customer(c.id)!;
  }
  addVisit(id: string): void {
    this.db.prepare("UPDATE customers SET visits = visits + 1 WHERE id = ?").run(id);
  }
  remember(id: string, fact: string): Customer {
    const c = this.customer(id);
    if (!c) throw new Error(`cliente '${id}' não existe`);
    const memory = [...c.memory, fact].slice(-20); // guarda só as 20 mais recentes
    this.db.prepare("UPDATE customers SET memory = ? WHERE id = ?").run(JSON.stringify(memory), id);
    return { ...c, memory };
  }

  // --- pedidos ---
  createOrder(customerId: string, items: OrderItem[], notes: string, total: number): Order {
    const { lastInsertRowid } = this.db
      .prepare("INSERT INTO orders (customer_id, items, notes, total) VALUES (?, ?, ?, ?)")
      .run(customerId, JSON.stringify(items), notes, total);
    return this.order(Number(lastInsertRowid))!;
  }
  order(id: number): Order | undefined {
    const r = this.db.prepare("SELECT * FROM orders WHERE id = ?").get(id);
    return r ? toOrder(r) : undefined;
  }
  updateOrder(id: number, patch: { items?: OrderItem[]; total?: number; status?: OrderStatus; accuracy?: number }): Order {
    const cur = this.order(id);
    if (!cur) throw new Error(`pedido #${id} não existe`);
    this.db
      .prepare("UPDATE orders SET items = ?, total = ?, status = ?, accuracy = ? WHERE id = ?")
      .run(
        JSON.stringify(patch.items ?? cur.items),
        patch.total ?? cur.total,
        patch.status ?? cur.status,
        patch.accuracy ?? cur.accuracy,
        id,
      );
    return this.order(id)!;
  }
  queue(): Order[] {
    return this.db
      .prepare("SELECT * FROM orders WHERE status IN ('aberto','preparando') ORDER BY id")
      .all()
      .map(toOrder);
  }

  // --- eventos / pontuação ---
  logEvent(type: string, points: number, payload: object = {}): void {
    this.db.prepare("INSERT INTO events (type, points, payload) VALUES (?, ?, ?)").run(type, points, JSON.stringify(payload));
  }
  score(): { points: number; served: number; avgAccuracy: number | null; revenue: number } {
    const p = this.db.prepare("SELECT COALESCE(SUM(points),0) AS points FROM events").get() as { points: number };
    const o = this.db
      .prepare(
        `SELECT COUNT(*) AS served, AVG(accuracy) AS avg, COALESCE(SUM(CASE WHEN status='pago' THEN total END),0) AS revenue
         FROM orders WHERE status IN ('servido','pago')`,
      )
      .get() as { served: number; avg: number | null; revenue: number };
    return { points: p.points, served: o.served, avgAccuracy: o.avg, revenue: o.revenue };
  }
}
