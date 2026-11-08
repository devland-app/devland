import { createContext, useContext } from "react";

import type { Order } from "../api/types.ts";

export interface Adoption {
  adoptedAt: string;
}

export interface AdoptionsContextValue {
  status: "loading" | "ready";
  // Mascotes adotados neste navegador (pedidos pagos), por ID de produto.
  adopted: ReadonlyMap<number, Adoption>;
  // Pedidos criados mas ainda não pagos ("Pagar depois" ou depois de uma recusa).
  pendingOrders: Order[];
  isPending: (productId: number) => boolean;
  // Atualiza na hora depois de criar ou pagar um pedido, sem esperar um novo carregamento.
  recordOrder: (order: Order) => void;
}

export const AdoptionsContext = createContext<AdoptionsContextValue | null>(null);

export function useAdoptions(): AdoptionsContextValue {
  const adoptions = useContext(AdoptionsContext);
  if (!adoptions) {
    throw new Error("useAdoptions precisa estar dentro de <AdoptionsProvider>");
  }
  return adoptions;
}
