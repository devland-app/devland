export type OrderStatus = "awaiting_payment" | "paid";

export interface OrderItem {
  productId: number;
  // Nome e preço copiados no momento da compra: o pedido não muda se o produto mudar depois.
  productName: string;
  unitPriceCoins: number;
  quantity: number;
  subtotalCoins: number;
}

export interface Order {
  // UUID: sem login, o ID é o que dá acesso ao pedido, então não pode ser adivinhável.
  id: string;
  status: OrderStatus;
  items: OrderItem[];
  totalCoins: number;
  createdAt: string;
  paidAt: string | null;
}

// O que o cliente envia: só produto e quantidade. Preço nunca vem de fora.
export interface OrderItemRequest {
  productId: number;
  quantity: number;
}
