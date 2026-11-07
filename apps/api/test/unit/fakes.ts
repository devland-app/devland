// Implementações em memória das interfaces que os services usam. Elas imitam as garantias que o
// banco dá na versão real (chave única, saldo que não fica negativo), para que os testes unitários
// exercitem as regras de negócio sem Postgres.
import type { Transaction, TransactionRunner } from "../../src/shared/database.js";
import type { OrderRepository, NewOrder } from "../../src/modules/orders/orders.repository.js";
import { DuplicateIdempotencyKeyError } from "../../src/modules/orders/orders.repository.js";
import type { Order, OrderStatus } from "../../src/modules/orders/orders.types.js";
import {
  AlreadyAnsweredError,
  type AttemptRepository,
  type EarnedAnswer,
  type NewAnswer,
  type NewAttempt,
} from "../../src/modules/quizzes/quizzes.repository.js";
import type { QuizAttempt } from "../../src/modules/quizzes/quizzes.types.js";
import type {
  MovementOutcome,
  WalletRepository,
} from "../../src/modules/wallets/wallets.repository.js";
import type { Wallet, WalletMovement } from "../../src/modules/wallets/wallets.types.js";

// Nos testes unitários não há banco: a "transação" é só um objeto que os fakes ignoram.
export const fakeTransaction = {} as Transaction;
export const runInFakeTransaction: TransactionRunner = (work) => work(fakeTransaction);

const NOW = "2026-11-07T12:00:00.000Z";

export class InMemoryWalletRepository implements WalletRepository {
  readonly wallets = new Map<string, Wallet>();
  readonly references = new Set<string>();

  async create(id: string): Promise<Wallet> {
    const wallet = { id, balanceCoins: 0, createdAt: NOW };
    this.wallets.set(id, wallet);
    return { ...wallet };
  }

  async findById(id: string): Promise<Wallet | undefined> {
    const wallet = this.wallets.get(id);
    return wallet ? { ...wallet } : undefined;
  }

  async applyMovement(movement: WalletMovement, signedAmount: number): Promise<MovementOutcome> {
    const key = `${movement.reason}:${movement.reference}`;
    if (this.references.has(key)) {
      return { status: "duplicate" };
    }
    const wallet = this.wallets.get(movement.walletId);
    if (!wallet || wallet.balanceCoins + signedAmount < 0) {
      return { status: "rejected" };
    }
    this.references.add(key);
    wallet.balanceCoins += signedAmount;
    return { status: "applied", balanceCoins: wallet.balanceCoins };
  }
}

export class InMemoryAttemptRepository implements AttemptRepository {
  readonly attempts = new Map<string, QuizAttempt>();
  readonly answers: NewAnswer[] = [];

  async create(attempt: NewAttempt): Promise<QuizAttempt> {
    const created = { ...attempt, createdAt: NOW };
    this.attempts.set(attempt.id, created);
    return created;
  }

  async findById(id: string): Promise<QuizAttempt | undefined> {
    return this.attempts.get(id);
  }

  async earnedAnswers(walletId: string): Promise<EarnedAnswer[]> {
    return this.answers
      .filter((answer) => answer.coinsAwarded > 0)
      .flatMap((answer) => {
        const attempt = this.attempts.get(answer.attemptId);
        return attempt?.walletId === walletId
          ? [
              {
                quizSlug: attempt.quizSlug,
                questionId: answer.questionId,
                coins: answer.coinsAwarded,
              },
            ]
          : [];
      });
  }

  async saveAnswer(answer: NewAnswer): Promise<void> {
    const repeated = this.answers.some(
      (saved) => saved.attemptId === answer.attemptId && saved.questionId === answer.questionId,
    );
    if (repeated) {
      throw new AlreadyAnsweredError();
    }
    this.answers.push(answer);
  }

  async countAnswers(attemptId: string): Promise<number> {
    return this.answers.filter((answer) => answer.attemptId === attemptId).length;
  }
}

export class InMemoryOrderRepository implements OrderRepository {
  readonly orders = new Map<string, Order & { idempotencyKey: string }>();

  async findById(id: string): Promise<Order | undefined> {
    return this.orders.get(id);
  }

  async findByIdempotencyKey(key: string): Promise<Order | undefined> {
    return [...this.orders.values()].find((order) => order.idempotencyKey === key);
  }

  async create(order: NewOrder): Promise<Order> {
    if (await this.findByIdempotencyKey(order.idempotencyKey)) {
      throw new DuplicateIdempotencyKeyError();
    }
    const created = {
      id: order.id,
      idempotencyKey: order.idempotencyKey,
      status: "awaiting_payment" as OrderStatus,
      items: order.items.map((item) => ({
        ...item,
        subtotalCoins: item.unitPriceCoins * item.quantity,
      })),
      totalCoins: order.totalCoins,
      createdAt: NOW,
      paidAt: null,
    };
    this.orders.set(order.id, created);
    return created;
  }

  async lockForPayment(id: string): Promise<OrderStatus | undefined> {
    return this.orders.get(id)?.status;
  }

  async markPaid(id: string): Promise<void> {
    const order = this.orders.get(id);
    if (order) {
      order.status = "paid";
      order.paidAt = NOW;
    }
  }
}
