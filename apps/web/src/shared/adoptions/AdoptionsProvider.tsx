import { useEffect, useMemo, useState, type ReactNode } from "react";

import { getOrder } from "../api/client.ts";
import type { Order } from "../api/types.ts";
import { readMyOrderIds } from "../myOrders.ts";
import { AdoptionsContext, type Adoption, type AdoptionsContextValue } from "./adoptionsContext.ts";

// Sem login, a coleção é o conjunto de pedidos feitos neste navegador. Os códigos ficam no
// localStorage e o status de cada pedido vem da API, que é quem sabe se ele foi pago.
export function AdoptionsProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [status, setStatus] = useState<"loading" | "ready">("loading");

  useEffect(() => {
    let active = true;
    Promise.allSettled(readMyOrderIds().map((id) => getOrder(id))).then((results) => {
      if (!active) return;
      // Um código que a API não conhece mais (banco recriado) é ignorado em vez de quebrar a coleção.
      setOrders(results.flatMap((result) => (result.status === "fulfilled" ? [result.value] : [])));
      setStatus("ready");
    });
    return () => {
      active = false;
    };
  }, []);

  const value = useMemo<AdoptionsContextValue>(() => {
    const adopted = new Map<number, Adoption>();
    for (const order of orders) {
      if (order.status !== "paid") continue;
      for (const item of order.items) {
        if (!adopted.has(item.productId)) {
          adopted.set(item.productId, { adoptedAt: order.paidAt ?? order.createdAt });
        }
      }
    }
    // Pedido pendente com um mascote que já foi adotado em outro pedido fica de fora: pagá-lo
    // adotaria o mesmo mascote duas vezes.
    const pendingOrders = orders.filter(
      (order) =>
        order.status === "awaiting_payment" &&
        order.items.every((item) => !adopted.has(item.productId)),
    );
    const pendingIds = new Set(
      pendingOrders.flatMap((order) => order.items.map((i) => i.productId)),
    );

    return {
      status,
      adopted,
      pendingOrders,
      isPending: (productId) => pendingIds.has(productId),
      recordOrder(order) {
        setOrders((current) => [order, ...current.filter((existing) => existing.id !== order.id)]);
      },
    };
  }, [orders, status]);

  return <AdoptionsContext.Provider value={value}>{children}</AdoptionsContext.Provider>;
}
