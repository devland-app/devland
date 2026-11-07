import { randomUUID } from "node:crypto";

import type { Transaction, TransactionRunner } from "../../shared/database.js";
import { OutOfStockError } from "../catalog/index.js";
import type { ChargeRequest, ChargeResult, Payment, PaymentMethod } from "../payments/index.js";
import { DuplicateIdempotencyKeyError, type OrderRepository } from "./orders.repository.js";
import type { Order, OrderItemRequest } from "./orders.types.js";

// Cada mascote é adotado uma vez: é uma coleção, não um estoque para revenda. O banco aceita até 10
// por item (a tabela permite), mas a regra de negócio da loja é uma unidade de cada por pedido.
export const MAX_UNITS_PER_PRODUCT = 1;

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
  reserveStock(
    items: Array<{ productId: number; quantity: number }>,
    trx: Transaction,
  ): Promise<void>;
}

// O que os pedidos usam do módulo de pagamentos (orders → payments, nunca o contrário).
export interface PaymentProcessor {
  authorize(request: ChargeRequest): Promise<ChargeResult>;
  record(request: ChargeRequest, result: ChargeResult, trx?: Transaction): Promise<Payment>;
  findApprovedPayment(orderId: string): Promise<Payment | undefined>;
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
    super(`Cada mascote é adotado uma vez só: ${productName} já está no pedido.`);
    this.name = "QuantityLimitError";
  }
}

export class InsufficientStockError extends Error {
  constructor(productName: string, available: number) {
    super(`Só temos ${available} unidade(s) de ${productName} no estoque.`);
    this.name = "InsufficientStockError";
  }
}

export class SoldOutError extends Error {
  constructor(productName: string) {
    super(`Enquanto você escolhia, alguém levou as últimas unidades de ${productName}.`);
    this.name = "SoldOutError";
  }
}

export class PaymentDeclinedError extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = "PaymentDeclinedError";
  }
}

export interface PayOrderResult {
  order: Order;
  payment: Payment;
  // true quando o pedido já estava pago: nada foi "cobrado" de novo.
  alreadyPaid: boolean;
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

// Regras de negócio dos pedidos. Não conhece HTTP nem Knex: recebe o repository, o catálogo, os
// pagamentos e quem abre transações já prontos.
export class OrdersService {
  private readonly orders: OrderRepository;
  private readonly catalog: ProductLookup;
  private readonly payments: PaymentProcessor;
  private readonly runInTransaction: TransactionRunner;

  constructor(
    orders: OrderRepository,
    catalog: ProductLookup,
    payments: PaymentProcessor,
    runInTransaction: TransactionRunner,
  ) {
    this.orders = orders;
    this.catalog = catalog;
    this.payments = payments;
    this.runInTransaction = runInTransaction;
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

  // Baixa de estoque, pagamento aprovado e pedido pago acontecem juntos (uma transação) ou não
  // acontecem. Uma recusa desfaz a baixa de estoque e fica registrada fora da transação.
  async payOrder(orderId: string, method: PaymentMethod): Promise<PayOrderResult> {
    const order = await this.getOrder(orderId);
    if (order.status === "paid") {
      return this.paidResult(orderId, true);
    }

    const request: ChargeRequest = { orderId, amountCents: order.totalCents, method };
    let outcome: "paid" | "already_paid";
    try {
      outcome = await this.runInTransaction(async (trx) => {
        // Dois pagamentos simultâneos do mesmo pedido: o segundo espera a trava e encontra "paid".
        const status = await this.orders.lockForPayment(orderId, trx);
        if (status === "paid") {
          return "already_paid";
        }
        await this.catalog.reserveStock(
          order.items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
          trx,
        );
        const result = await this.payments.authorize(request);
        if (result.status === "declined") {
          throw new PaymentDeclinedError(result.reason);
        }
        await this.payments.record(request, result, trx);
        await this.orders.markPaid(orderId, trx);
        return "paid";
      });
    } catch (error) {
      if (error instanceof PaymentDeclinedError) {
        await this.payments.record(request, { status: "declined", reason: error.message });
      }
      if (error instanceof OutOfStockError) {
        const item = order.items.find((candidate) => candidate.productId === error.productId);
        throw new SoldOutError(item?.productName ?? "um dos mascotes");
      }
      throw error;
    }
    return this.paidResult(orderId, outcome === "already_paid");
  }

  private async paidResult(orderId: string, alreadyPaid: boolean): Promise<PayOrderResult> {
    const [order, payment] = await Promise.all([
      this.getOrder(orderId),
      this.payments.findApprovedPayment(orderId),
    ]);
    if (!payment) {
      throw new Error(`Pedido ${orderId} está pago, mas sem pagamento aprovado registrado`);
    }
    return { order, payment, alreadyPaid };
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
