import { beforeEach, describe, expect, it } from "vitest";

import { OutOfStockError } from "../../src/modules/catalog/index.js";
import {
  DuplicateIdempotencyKeyError,
  type NewOrder,
} from "../../src/modules/orders/orders.repository.js";
import {
  InsufficientStockError,
  OrderNotFoundError,
  OrdersService,
  PaymentDeclinedError,
  QuantityLimitError,
  SoldOutError,
  UnknownProductsError,
  type CatalogProduct,
  type PaymentProcessor,
  type ProductLookup,
} from "../../src/modules/orders/orders.service.js";
import type { Order } from "../../src/modules/orders/orders.types.js";
import type { ChargeRequest, ChargeResult, Payment } from "../../src/modules/payments/index.js";
import type { Transaction } from "../../src/shared/database.js";
import { InMemoryOrderRepository, runInFakeTransaction } from "./fakes.js";

const WALLET = "11111111-1111-4111-8111-111111111111";

class FakeCatalog implements ProductLookup {
  readonly products: CatalogProduct[] = [
    { id: 1, name: "Caranguejo dos Contêineres", priceCoins: 120, stock: 5 },
    { id: 2, name: "Corujinha das Branches", priceCoins: 80, stock: 5 },
    { id: 3, name: "Polvo Orquestrador", priceCoins: 150, stock: 0 },
  ];
  soldOut = new Set<number>();

  async getProductsByIds(ids: number[]): Promise<CatalogProduct[]> {
    return this.products.filter((product) => ids.includes(product.id));
  }

  async reserveStock(items: Array<{ productId: number }>): Promise<void> {
    const missing = items.find((item) => this.soldOut.has(item.productId));
    if (missing) {
      throw new OutOfStockError(missing.productId);
    }
  }
}

// Pagamentos de mentira com decisão controlada pelo teste. Guarda se cada gravação aconteceu
// dentro ou fora da transação do pedido.
class FakePayments implements PaymentProcessor {
  decision: ChargeResult = { status: "approved", receiptCode: "DL-TESTE001" };
  authorizations = 0;
  readonly recorded: Array<{ payment: Payment; insideTransaction: boolean }> = [];

  async authorize(_request: ChargeRequest, _trx: Transaction): Promise<ChargeResult> {
    this.authorizations += 1;
    return this.decision;
  }

  async record(request: ChargeRequest, result: ChargeResult, trx?: Transaction): Promise<Payment> {
    const payment: Payment = {
      id: `pagamento-${this.recorded.length + 1}`,
      orderId: request.orderId,
      walletId: request.walletId,
      method: "coins",
      status: result.status,
      amountCoins: request.amountCoins,
      receiptCode: result.status === "approved" ? result.receiptCode : null,
      declineReason: result.status === "declined" ? result.reason : null,
      createdAt: "2026-11-07T12:00:00.000Z",
    };
    this.recorded.push({ payment, insideTransaction: trx !== undefined });
    return payment;
  }

  async findApprovedPayment(orderId: string): Promise<Payment | undefined> {
    return this.recorded
      .map((entry) => entry.payment)
      .find((payment) => payment.orderId === orderId && payment.status === "approved");
  }
}

describe("OrdersService", () => {
  let orders: InMemoryOrderRepository;
  let catalog: FakeCatalog;
  let payments: FakePayments;
  let service: OrdersService;

  beforeEach(() => {
    orders = new InMemoryOrderRepository();
    catalog = new FakeCatalog();
    payments = new FakePayments();
    service = new OrdersService(orders, catalog, payments, runInFakeTransaction);
  });

  const create = (items: Array<{ productId: number; quantity: number }>, key = "chave-0001") =>
    service.createOrder({ idempotencyKey: key, items });

  describe("criar pedido", () => {
    it("usa nome e preço do catálogo, nunca do cliente", async () => {
      const { order, created } = await create([
        { productId: 1, quantity: 1 },
        { productId: 2, quantity: 1 },
      ]);
      expect(created).toBe(true);
      expect(order.status).toBe("awaiting_payment");
      expect(order.totalCoins).toBe(200);
      expect(order.items.map((item) => [item.productName, item.unitPriceCoins])).toEqual([
        ["Caranguejo dos Contêineres", 120],
        ["Corujinha das Branches", 80],
      ]);
    });

    it("devolve o mesmo pedido para a mesma Idempotency-Key", async () => {
      const first = await create([{ productId: 1, quantity: 1 }]);
      const again = await create([{ productId: 2, quantity: 1 }]);
      expect(again.created).toBe(false);
      expect(again.order.id).toBe(first.order.id);
      expect(orders.orders.size).toBe(1);
    });

    it("devolve o pedido vencedor quando duas requisições com a mesma chave chegam juntas", async () => {
      const winner = await create([{ productId: 1, quantity: 1 }], "chave-corrida");
      // Simula a corrida: a consulta inicial não vê o pedido, mas o banco recusa o segundo.
      let lookups = 0;
      const racing = Object.assign(Object.create(orders) as InMemoryOrderRepository, {
        findByIdempotencyKey: async (key: string) =>
          lookups++ === 0 ? undefined : orders.findByIdempotencyKey(key),
        create: async (_order: NewOrder): Promise<Order> => {
          throw new DuplicateIdempotencyKeyError();
        },
      });
      const racer = new OrdersService(racing, catalog, payments, runInFakeTransaction);
      const result = await racer.createOrder({
        idempotencyKey: "chave-corrida",
        items: [{ productId: 1, quantity: 1 }],
      });
      expect(result).toEqual({ order: winner.order, created: false });
    });

    it("recusa produto inexistente, mascote repetido e estoque zerado", async () => {
      await expect(create([{ productId: 99, quantity: 1 }])).rejects.toBeInstanceOf(
        UnknownProductsError,
      );
      await expect(
        create([
          { productId: 1, quantity: 1 },
          { productId: 1, quantity: 1 },
        ]),
      ).rejects.toBeInstanceOf(QuantityLimitError);
      await expect(create([{ productId: 3, quantity: 1 }])).rejects.toBeInstanceOf(
        InsufficientStockError,
      );
    });
  });

  describe("pagar pedido", () => {
    it("aprova dentro da transação e marca o pedido como pago", async () => {
      const { order } = await create([{ productId: 1, quantity: 1 }]);
      const result = await service.payOrder(order.id, WALLET);
      expect(result.alreadyPaid).toBe(false);
      expect(result.order.status).toBe("paid");
      expect(result.payment.receiptCode).toBe("DL-TESTE001");
      expect(payments.recorded).toEqual([expect.objectContaining({ insideTransaction: true })]);
    });

    it("pagar de novo devolve o mesmo recibo, sem cobrar outra vez", async () => {
      const { order } = await create([{ productId: 1, quantity: 1 }]);
      const first = await service.payOrder(order.id, WALLET);
      const again = await service.payOrder(order.id, WALLET);
      expect(again.alreadyPaid).toBe(true);
      expect(again.payment.id).toBe(first.payment.id);
      expect(payments.authorizations).toBe(1);
    });

    it("grava a recusa fora da transação e mantém o pedido aguardando", async () => {
      const { order } = await create([{ productId: 1, quantity: 1 }]);
      payments.decision = { status: "declined", reason: "Saldo insuficiente: faltam 20 moedas." };
      await expect(service.payOrder(order.id, WALLET)).rejects.toBeInstanceOf(PaymentDeclinedError);
      expect(payments.recorded).toEqual([
        expect.objectContaining({
          insideTransaction: false,
          payment: expect.objectContaining({ status: "declined" }),
        }),
      ]);
      expect((await service.getOrder(order.id)).status).toBe("awaiting_payment");
    });

    it("avisa qual mascote esgotou enquanto a pessoa escolhia", async () => {
      const { order } = await create([{ productId: 2, quantity: 1 }]);
      catalog.soldOut.add(2);
      await expect(service.payOrder(order.id, WALLET)).rejects.toThrow(
        new SoldOutError("Corujinha das Branches").message,
      );
    });

    it("avisa quando o pedido não existe", async () => {
      await expect(service.payOrder("nao-existe", WALLET)).rejects.toBeInstanceOf(
        OrderNotFoundError,
      );
    });
  });
});
