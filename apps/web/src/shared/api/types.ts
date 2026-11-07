// Espelho dos schemas do contrato (docs/openapi.yaml). Valores em centavos, datas em ISO 8601.

export interface Product {
  id: number;
  slug: string;
  name: string;
  concept: string;
  description: string;
  priceCents: number;
  stock: number;
  imageUrl: string;
  // O conceito de DevOps que o mascote ensina.
  lesson: {
    explanation: string;
    realWorld: string;
    inDevZoo: string;
  };
}

export interface OrderItem {
  productId: number;
  productName: string;
  unitPriceCents: number;
  quantity: number;
  subtotalCents: number;
}

export interface Order {
  id: string;
  status: "awaiting_payment" | "paid";
  items: OrderItem[];
  totalCents: number;
  createdAt: string;
  paidAt: string | null;
}

export type PaymentMethod = "pix" | "toy_card" | "broke_toy_card";

export interface Payment {
  id: string;
  method: PaymentMethod;
  status: "approved";
  amountCents: number;
  receiptCode: string;
  createdAt: string;
}

export interface PayOrderResponse {
  notice: string;
  order: Order;
  payment: Payment;
}

export interface CartItemRequest {
  productId: number;
  quantity: number;
}
