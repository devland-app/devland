import { createContext, useContext } from "react";

import type { Product } from "../api/types.ts";

// Cópia do mascote no momento em que entrou no carrinho, só para exibir. O preço que vale é o que
// a API calcula ao criar o pedido; a revisão do checkout mostra esse valor oficial.
export interface CartLine {
  productId: number;
  name: string;
  priceCoins: number;
  imageUrl: string;
}

export interface CartContextValue {
  lines: CartLine[];
  count: number;
  estimatedTotalCoins: number;
  has: (productId: number) => boolean;
  // Um de cada: adotar de novo tira o mascote do carrinho.
  toggle: (product: Product) => void;
  remove: (productId: number) => void;
}

export const CartContext = createContext<CartContextValue | null>(null);

export function useCart(): CartContextValue {
  const cart = useContext(CartContext);
  if (!cart) {
    throw new Error("useCart precisa estar dentro de <CartProvider>");
  }
  return cart;
}
