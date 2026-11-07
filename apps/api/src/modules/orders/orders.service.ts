import { randomUUID } from "node:crypto";

import { DuplicateIdempotencyKeyError, type OrderRepository } from "./orders.repository.js";
import type { Order, OrderItemRequest } from "./orders.types.js";

export const MAX_UNITS_PER_PRODUCT = 10;

// O que o módulo de pedidos precisa saber de um produto. O catálogo fornece isso pela API pública
// dele; nos testes, entra um catálogo em memória com o mesmo formato.
export interface CatalogProduct {
  id: number;
  name: string;
  priceCents: number;
  stock: number;
}

export interface ProductLookup {
  getProductsByIds(ids: number[]): Promise<CatalogProduct[]>;
}

export class OrderNotFoundError extends Error {
  constructor(id: string) {
    super(`Pedido ${id} não encontrado`);
    this.name = "OrderNotFoundError";
  }
}

export class UnknownProductsError extends Error {
  readonly productIds: number[];

  constructor(productIds: number[]) {
    super(`Produtos inexistentes: ${productIds.join(", ")}`);
    this.name = "UnknownProductsError";
    this.productIds = productIds;
  }
}

export class QuantityLimitError extends Error {
  constructor(productName: string) {
    super(`Cada pedido aceita até ${MAX_UNITS_PER_PRODUCT} unidades de ${productName}.`);
    this.name = "QuantityLimitError";
  }
}

export class InsufficientStockError extends Error {
  constructor(productName: string, available: number) {
    super(`Só temos ${available} unidade(s) de ${productName} no estoque.`);
    this.name = "InsufficientStockError";
  }
}

export interface CreateOrderInput {
  idempotencyKey: string;
  items: OrderItemRequest[];
}

export interface CreateOrderResult {
  order: Order;
  // false quando a Idempotency-Key já tinha sido usada e o pedido existente foi devolvido.
  created: boolean;
}

// Regras de negócio dos pedidos. Não conhece HTTP nem Knex: recebe o repository e o catálogo prontos.
export class OrdersService {
  private readonly orders: OrderRepository;
  private readonly catalog: ProductLookup;

  constructor(orders: OrderRepository, catalog: ProductLookup) {
    this.orders = orders;
    this.catalog = catalog;
  }

  async createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
    const existing = await this.orders.findByIdempotencyKey(input.idempotencyKey);
    if (existing) {
      return { order: existing, created: false };
    }

    const quantities = sumQuantitiesByProduct(input.items);
    const productIds = [...quantities.keys()];
    const products = await this.catalog.getProductsByIds(productIds);

    const missing = productIds.filter((id) => !products.some((product) => product.id === id));
    if (missing.length > 0) {
      throw new UnknownProductsError(missing);
    }

    // O preço vem do catálogo, nunca do cliente. O estoque é só conferido aqui: a baixa acontece
    // no pagamento, para que um pedido abandonado não segure unidades que outra pessoa compraria.
    const items = products.map((product) => {
      const quantity = quantities.get(product.id) ?? 0;
      if (quantity > MAX_UNITS_PER_PRODUCT) {
        throw new QuantityLimitError(product.name);
      }
      if (quantity > product.stock) {
        throw new InsufficientStockError(product.name, product.stock);
      }
      return {
        productId: product.id,
        productName: product.name,
        unitPriceCents: product.priceCents,
        quantity,
      };
    });
    const totalCents = items.reduce((sum, item) => sum + item.unitPriceCents * item.quantity, 0);

    try {
      const order = await this.orders.create({
        id: randomUUID(),
        idempotencyKey: input.idempotencyKey,
        totalCents,
        items,
      });
      return { order, created: true };
    } catch (error) {
      // Dois pedidos com a mesma chave chegaram ao mesmo tempo: o banco aceitou só o primeiro.
      if (error instanceof DuplicateIdempotencyKeyError) {
        const winner = await this.orders.findByIdempotencyKey(input.idempotencyKey);
        if (winner) {
          return { order: winner, created: false };
        }
      }
      throw error;
    }
  }

  async getOrder(id: string): Promise<Order> {
    const order = await this.orders.findById(id);
    if (!order) {
      throw new OrderNotFoundError(id);
    }
    return order;
  }
}

// O mesmo produto pode vir em mais de uma linha do carrinho: as quantidades são somadas.
function sumQuantitiesByProduct(items: OrderItemRequest[]): Map<number, number> {
  const quantities = new Map<number, number>();
  for (const item of items) {
    quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + item.quantity);
  }
  return quantities;
}
