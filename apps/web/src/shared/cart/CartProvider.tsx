import { useEffect, useMemo, useState, type ReactNode } from "react";

import { useAdoptions } from "../adoptions/adoptionsContext.ts";
import { readStored, writeStored } from "../storage.ts";
import { CartContext, type CartContextValue, type CartLine } from "./cartContext.ts";

const STORAGE_KEY = "devland-cart";

// O que está no localStorage pode ser de uma versão antiga da loja: só aceita linhas completas.
function isCartLine(value: unknown): value is CartLine {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const line = value as Record<string, unknown>;
  return (
    typeof line.productId === "number" &&
    typeof line.name === "string" &&
    typeof line.priceCoins === "number" &&
    typeof line.imageUrl === "string"
  );
}

function isCartLines(value: unknown): value is CartLine[] {
  return Array.isArray(value) && value.every(isCartLine);
}

export function CartProvider({ children }: { children: ReactNode }) {
  const adoptions = useAdoptions();
  // O carrinho fica no navegador: sem login, é assim que ele sobrevive a um recarregar de página.
  const [stored, setStored] = useState<CartLine[]>(() => readStored(STORAGE_KEY, isCartLines, []));
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    writeStored(STORAGE_KEY, stored);
  }, [stored]);

  const value = useMemo<CartContextValue>(() => {
    // Mascote já adotado ou num pedido aguardando pagamento não aparece mais no carrinho.
    const lines = stored.filter(
      (line) => !adoptions.adopted.has(line.productId) && !adoptions.isPending(line.productId),
    );
    const has = (productId: number) => lines.some((line) => line.productId === productId);

    return {
      lines,
      count: lines.length,
      estimatedTotalCoins: lines.reduce((sum, line) => sum + line.priceCoins, 0),
      has,
      toggle(product) {
        if (has(product.id)) {
          setStored((current) => current.filter((line) => line.productId !== product.id));
          setAnnouncement(`${product.name} saiu do carrinho.`);
          return;
        }
        setStored((current) => [
          ...current.filter((line) => line.productId !== product.id),
          {
            productId: product.id,
            name: product.name,
            priceCoins: product.priceCoins,
            imageUrl: product.imageUrl,
          },
        ]);
        setAnnouncement(`${product.name} entrou no carrinho.`);
      },
      remove(productId) {
        setStored((current) => current.filter((line) => line.productId !== productId));
      },
    };
  }, [stored, adoptions]);

  return (
    <CartContext.Provider value={value}>
      {children}
      {/* Anuncia para leitores de tela o que mudou no carrinho, sem mover o foco. */}
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
    </CartContext.Provider>
  );
}
