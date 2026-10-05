// Contratos únicos do jogo. Usados pelo MCP server, backend e web.
import { z } from "zod";

export const Size = z.enum(["P", "M", "G"]);
export type Size = z.infer<typeof Size>;

export const Modifier = z.enum([
  "leite integral",
  "leite de aveia",
  "leite sem lactose",
  "extra shot",
  "descafeinado",
  "sem açúcar",
  "adoçante",
  "gelo",
  "chantilly",
  "canela",
  "caramelo",
]);
export type Modifier = z.infer<typeof Modifier>;

/** Item como o cliente pede OU como o barista prepara. */
export const OrderItem = z.object({
  itemId: z.string().describe("id do cardápio, ex: 'latte'"),
  size: Size.default("M"),
  modifiers: z.array(Modifier).default([]),
});
export type OrderItem = z.infer<typeof OrderItem>;

export const OrderStatus = z.enum(["aberto", "preparando", "servido", "pago", "cancelado"]);
export type OrderStatus = z.infer<typeof OrderStatus>;

export const Emotion = z.enum(["feliz", "neutro", "impaciente", "irritado", "confuso", "encantado"]);
export type Emotion = z.infer<typeof Emotion>;

export type MenuItem = {
  id: string;
  name: string;
  description: string;
  prices: Record<Size, number>;
};

export type Customer = {
  id: string;
  name: string;
  archetype: string;
  persona: string;
  visits: number;
  memory: string[];
};

export type Order = {
  id: number;
  customerId: string;
  items: OrderItem[];
  status: OrderStatus;
  notes: string;
  total: number;
  accuracy: number | null;
  createdAt: string;
};
