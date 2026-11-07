import { createContext, useContext } from "react";

import type { Product } from "../../shared/api/types.ts";

// Cópia do produto no momento em que entrou no carrinho, só para exibir. O preço que vale é o que
// a API calcula ao criar o pedido; a revisão do checkout mostra esse valor oficial.
export interface CartLine {
  productId: number;
  name: string;
  priceCents: number;
  imageUrl: string;
  stock: number;
  quantity: number;
}

export interface CartContextValue {
  lines: CartLine[];
  units: number;
  estimatedTotalCents: number;
  maxUnitsFor: (productId: number) => number;
  add: (product: Product) => void;
  setQuantity: (productId: number, quantity: number) => void;
  clear: () => void;
}

export const CartContext = createContext<CartContextValue | null>(null);

export function useCart(): CartContextValue {
  const cart = useContext(CartContext);
  if (!cart) {
    throw new Error("useCart precisa estar dentro de <CartProvider>");
  }
  return cart;
}
