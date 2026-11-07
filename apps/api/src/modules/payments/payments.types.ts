export const PAYMENT_METHODS = ["pix", "toy_card", "broke_toy_card"] as const;

// Pix simulado, cartão simulado e cartão simulado sem saldo (para ver uma recusa).
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export type PaymentStatus = "approved" | "declined";

export interface Payment {
  id: string;
  orderId: string;
  method: PaymentMethod;
  status: PaymentStatus;
  amountCents: number;
  receiptCode: string | null;
  declineReason: string | null;
  createdAt: string;
}

export interface ChargeRequest {
  orderId: string;
  amountCents: number;
  method: PaymentMethod;
}

export type ChargeResult =
  { status: "approved"; receiptCode: string } | { status: "declined"; reason: string };
