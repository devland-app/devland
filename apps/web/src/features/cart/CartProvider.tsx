import { useEffect, useMemo, useState, type ReactNode } from "react";

import { readStored, writeStored } from "../../shared/storage.ts";
import { CartContext, type CartContextValue, type CartLine } from "./cartContext.ts";

const STORAGE_KEY = "devzoo-cart";
// Mesmo limite da API: até 10 unidades de cada mascote por pedido.
const MAX_UNITS_PER_PRODUCT = 10;

// O que está no localStorage pode ser de uma versão antiga da loja: só aceita linhas completas.
function isCartLine(value: unknown): value is CartLine {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const line = value as Record<string, unknown>;
  return (
    typeof line.productId === "number" &&
    typeof line.name === "string" &&
    typeof line.priceCents === "number" &&
    typeof line.imageUrl === "string" &&
    typeof line.stock === "number" &&
    typeof line.quantity === "number"
  );
}

function isCartLines(value: unknown): value is CartLine[] {
  return Array.isArray(value) && value.every(isCartLine);
}

export function CartProvider({ children }: { children: ReactNode }) {
  // O carrinho fica no navegador: sem login, é assim que ele sobrevive a um recarregar de página.
  const [lines, setLines] = useState<CartLine[]>(() => readStored(STORAGE_KEY, isCartLines, []));
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    writeStored(STORAGE_KEY, lines);
  }, [lines]);

  const value = useMemo<CartContextValue>(() => {
    const maxUnitsFor = (productId: number) => {
      const line = lines.find((candidate) => candidate.productId === productId);
      return Math.min(MAX_UNITS_PER_PRODUCT, line ? line.stock : MAX_UNITS_PER_PRODUCT);
    };

    return {
      lines,
      units: lines.reduce((sum, line) => sum + line.quantity, 0),
      estimatedTotalCents: lines.reduce((sum, line) => sum + line.priceCents * line.quantity, 0),
      maxUnitsFor,
      add(product) {
        setLines((current) => {
          const existing = current.find((line) => line.productId === product.id);
          const limit = Math.min(MAX_UNITS_PER_PRODUCT, product.stock);
          if (existing) {
            return current.map((line) =>
              line.productId === product.id
                ? { ...line, quantity: Math.min(line.quantity + 1, limit), stock: product.stock }
                : line,
            );
          }
          return [
            ...current,
            {
              productId: product.id,
              name: product.name,
              priceCents: product.priceCents,
              imageUrl: product.imageUrl,
              stock: product.stock,
              quantity: 1,
            },
          ];
        });
        setAnnouncement(`${product.name} foi para o carrinho.`);
      },
      setQuantity(productId, quantity) {
        setLines((current) =>
          quantity <= 0
            ? current.filter((line) => line.productId !== productId)
            : current.map((line) =>
                line.productId === productId
                  ? { ...line, quantity: Math.min(quantity, maxUnitsFor(productId)) }
                  : line,
              ),
        );
      },
      clear() {
        setLines([]);
      },
    };
  }, [lines]);

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
