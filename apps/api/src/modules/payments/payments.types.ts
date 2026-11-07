// "coins" é a única forma de pagamento. As outras são as simulações que existiam antes das moedas
// (Pix, cartão e cartão sem saldo) e só aparecem em pagamentos antigos.
export const LEGACY_PAYMENT_METHODS = ["pix", "toy_card", "broke_toy_card"] as const;
export const PAYMENT_METHODS = ["coins", ...LEGACY_PAYMENT_METHODS] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export type PaymentStatus = "approved" | "declined";

export interface Payment {
  id: string;
  orderId: string;
  // Carteira que pagou; pagamentos antigos, de antes das moedas, não têm.
  walletId: string | null;
  method: PaymentMethod;
  status: PaymentStatus;
  amountCoins: number;
  receiptCode: string | null;
  declineReason: string | null;
  createdAt: string;
}

export interface ChargeRequest {
  orderId: string;
  walletId: string;
  amountCoins: number;
}

export type ChargeResult =
  { status: "approved"; receiptCode: string } | { status: "declined"; reason: string };
