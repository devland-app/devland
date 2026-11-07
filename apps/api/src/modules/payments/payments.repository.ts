import type { Database, Transaction } from "../../shared/database.js";
import type { Payment, PaymentMethod, PaymentStatus } from "./payments.types.js";

export type NewPayment = Omit<Payment, "createdAt">;

export interface PaymentRepository {
  save(payment: NewPayment, trx?: Transaction): Promise<Payment>;
  findApprovedByOrderId(orderId: string): Promise<Payment | undefined>;
}

interface PaymentRow {
  id: string;
  order_id: string;
  method: PaymentMethod;
  status: PaymentStatus;
  amount_cents: number;
  receipt_code: string | null;
  decline_reason: string | null;
  created_at: Date;
}

const PAYMENT_COLUMNS = [
  "id",
  "order_id",
  "method",
  "status",
  "amount_cents",
  "receipt_code",
  "decline_reason",
  "created_at",
] as const;

export class KnexPaymentRepository implements PaymentRepository {
  private readonly db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  // Grava dentro da transação de quem coordena o pagamento, quando houver uma.
  async save(payment: NewPayment, trx?: Transaction): Promise<Payment> {
    const executor = trx ?? this.db;
    const [row] = await executor<PaymentRow>("payments")
      .insert({
        id: payment.id,
        order_id: payment.orderId,
        method: payment.method,
        status: payment.status,
        amount_cents: payment.amountCents,
        receipt_code: payment.receiptCode,
        decline_reason: payment.declineReason,
      })
      .returning([...PAYMENT_COLUMNS]);
    if (!row) {
      throw new Error(`Pagamento ${payment.id} não foi gravado`);
    }
    return toPayment(row);
  }

  async findApprovedByOrderId(orderId: string): Promise<Payment | undefined> {
    const row = await this.db<PaymentRow>("payments")
      .select(...PAYMENT_COLUMNS)
      .where({ order_id: orderId, status: "approved" })
      .first();
    return row ? toPayment(row) : undefined;
  }
}

function toPayment(row: PaymentRow): Payment {
  return {
    id: row.id,
    orderId: row.order_id,
    method: row.method,
    status: row.status,
    amountCents: row.amount_cents,
    receiptCode: row.receipt_code,
    declineReason: row.decline_reason,
    createdAt: row.created_at.toISOString(),
  };
}
