import { useEffect, useState } from "react";

import { ApiError, listProducts } from "./api/client.ts";
import type { Product } from "./api/types.ts";

export type ProductsState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; products: Product[] };

export function useProducts(): { state: ProductsState; retry: () => void } {
  const [state, setState] = useState<ProductsState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    // Evita gravar a resposta de uma busca antiga se o componente sair da tela antes dela chegar.
    let active = true;
    listProducts()
      .then((products) => {
        if (active) setState({ status: "ready", products });
      })
      .catch((error: unknown) => {
        if (active) {
          setState({
            status: "error",
            message:
              error instanceof ApiError ? error.message : "Não deu para carregar a vitrine agora.",
          });
        }
      });
    return () => {
      active = false;
    };
  }, [attempt]);

  function retry() {
    setState({ status: "loading" });
    setAttempt((value) => value + 1);
  }

  return { state, retry };
}
