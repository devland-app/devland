import { useEffect, useState } from "react";

import { ApiError, getOrder } from "../../shared/api/client.ts";
import type { Order } from "../../shared/api/types.ts";
import { readMyOrderIds } from "../../shared/myOrders.ts";

export type MyOrdersState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; orders: Order[] };

// Busca na API cada pedido guardado neste navegador. Um código que a API não conhece mais (banco
// recriado, por exemplo) é ignorado, em vez de quebrar a lista inteira.
export function useMyOrders(): MyOrdersState {
  const [state, setState] = useState<MyOrdersState>({ status: "loading" });

  useEffect(() => {
    let active = true;
    const ids = readMyOrderIds();
    Promise.allSettled(ids.map((id) => getOrder(id))).then((results) => {
      if (!active) return;
      const orders = results.flatMap((result) =>
        result.status === "fulfilled" ? [result.value] : [],
      );
      const unreachable = results.some(
        (result) =>
          result.status === "rejected" &&
          !(result.reason instanceof ApiError && result.reason.status === 404),
      );
      if (unreachable && orders.length === 0) {
        setState({ status: "error", message: "Não deu para carregar seus pedidos agora." });
        return;
      }
      setState({ status: "ready", orders });
    });
    return () => {
      active = false;
    };
  }, []);

  return state;
}
