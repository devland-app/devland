import type { Database, Transaction } from "../../shared/database.js";
import type { Order, OrderItem, OrderStatus } from "./orders.types.js";

export interface NewOrder {
  id: string;
  idempotencyKey: string;
  totalCents: number;
  items: Omit<OrderItem, "subtotalCents">[];
}

// Outro pedido já foi gravado com a mesma Idempotency-Key (ex.: dois cliques chegando juntos).
export class DuplicateIdempotencyKeyError extends Error {
  constructor() {
    super("Já existe um pedido com esta Idempotency-Key");
    this.name = "DuplicateIdempotencyKeyError";
  }
}

export interface OrderRepository {
  findById(id: string): Promise<Order | undefined>;
  findByIdempotencyKey(key: string): Promise<Order | undefined>;
  create(order: NewOrder): Promise<Order>;
  lockForPayment(id: string, trx: Transaction): Promise<OrderStatus | undefined>;
  markPaid(id: string, trx: Transaction): Promise<void>;
}

interface OrderRow {
  id: string;
  status: OrderStatus;
  total_cents: number;
  created_at: Date;
  paid_at: Date | null;
}

interface OrderItemRow {
  product_id: number;
  product_name: string;
  unit_price_cents: number;
  quantity: number;
}

// Tipos das tabelas inteiras (usados nos filtros); as linhas lidas trazem só as colunas selecionadas.
interface OrdersTable extends OrderRow {
  idempotency_key: string;
}

interface OrderItemsTable extends OrderItemRow {
  order_id: string;
}

const ORDER_COLUMNS = ["id", "status", "total_cents", "created_at", "paid_at"] as const;
const ITEM_COLUMNS = ["product_id", "product_name", "unit_price_cents", "quantity"] as const;

// Código do Postgres para violação de unicidade.
const UNIQUE_VIOLATION = "23505";

export class KnexOrderRepository implements OrderRepository {
  private readonly db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  async findById(id: string): Promise<Order | undefined> {
    const row = await this.db<OrdersTable>("orders")
      .select(...ORDER_COLUMNS)
      .where({ id })
      .first();
    return row ? this.withItems(row) : undefined;
  }

  async findByIdempotencyKey(key: string): Promise<Order | undefined> {
    const row = await this.db<OrdersTable>("orders")
      .select(...ORDER_COLUMNS)
      .where({ idempotency_key: key })
      .first();
    return row ? this.withItems(row) : undefined;
  }

  async create(order: NewOrder): Promise<Order> {
    try {
      // Pedido e itens na mesma transação: ou grava tudo, ou nada.
      await this.db.transaction(async (trx) => {
        await trx("orders").insert({
          id: order.id,
          idempotency_key: order.idempotencyKey,
          status: "awaiting_payment",
          total_cents: order.totalCents,
        });
        await trx("order_items").insert(
          order.items.map((item) => ({
            order_id: order.id,
            product_id: item.productId,
            product_name: item.productName,
            unit_price_cents: item.unitPriceCents,
            quantity: item.quantity,
          })),
        );
      });
    } catch (error) {
      if (isUniqueViolation(error, "orders_idempotency_key_unique")) {
        throw new DuplicateIdempotencyKeyError();
      }
      throw error;
    }

    const created = await this.findById(order.id);
    if (!created) {
      throw new Error(`Pedido ${order.id} não encontrado logo após ser criado`);
    }
    return created;
  }

  // SELECT ... FOR UPDATE: trava a linha do pedido até o fim da transação. Um segundo pagamento
  // do mesmo pedido espera aqui e, quando passa, já encontra o status "paid".
  async lockForPayment(id: string, trx: Transaction): Promise<OrderStatus | undefined> {
    const row = await trx<OrdersTable>("orders").select("status").where({ id }).forUpdate().first();
    return row?.status;
  }

  async markPaid(id: string, trx: Transaction): Promise<void> {
    await trx<OrdersTable>("orders")
      .where({ id, status: "awaiting_payment" })
      .update({ status: "paid", paid_at: trx.fn.now() });
  }

  private async withItems(row: OrderRow): Promise<Order> {
    const items = await this.db<OrderItemsTable>("order_items")
      .select(...ITEM_COLUMNS)
      .where({ order_id: row.id })
      .orderBy("product_id");
    return {
      id: row.id,
      status: row.status,
      items: items.map((item) => ({
        productId: item.product_id,
        productName: item.product_name,
        unitPriceCents: item.unit_price_cents,
        quantity: item.quantity,
        subtotalCents: item.unit_price_cents * item.quantity,
      })),
      totalCents: row.total_cents,
      createdAt: row.created_at.toISOString(),
      paidAt: row.paid_at ? row.paid_at.toISOString() : null,
    };
  }
}

function isUniqueViolation(error: unknown, constraint: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === UNIQUE_VIOLATION &&
    "constraint" in error &&
    error.constraint === constraint
  );
}
