import { act, renderHook, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getOrder } from "../api/client.ts";
import type { Order, Product } from "../api/types.ts";
import { AdoptionsProvider } from "../adoptions/AdoptionsProvider.tsx";
import { useCart } from "./cartContext.ts";
import { CartProvider } from "./CartProvider.tsx";

vi.mock("../api/client.ts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../api/client.ts")>()),
  getOrder: vi.fn(),
}));

const product = (id: number, priceCoins: number) =>
  ({ id, name: `Mascote ${id}`, priceCoins, imageUrl: `/images/mascots/${id}.svg` }) as Product;

const wrapper = ({ children }: { children: ReactNode }) => (
  <AdoptionsProvider>
    <CartProvider>{children}</CartProvider>
  </AdoptionsProvider>
);

describe("CartProvider", () => {
  beforeEach(() => {
    vi.mocked(getOrder).mockReset();
  });

  it("descarta um carrinho salvo em formato antigo ou quebrado", () => {
    localStorage.setItem(
      "devland-cart",
      JSON.stringify([{ productId: 1, name: "Antigo", priceCents: 4990, imageUrl: "/a.svg" }]),
    );
    const { result } = renderHook(() => useCart(), { wrapper });
    expect(result.current.lines).toEqual([]);
  });

  it("um de cada: incluir de novo tira do carrinho, e o leitor de tela é avisado", () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => result.current.toggle(product(1, 120)));
    act(() => result.current.toggle(product(2, 80)));
    expect(result.current.count).toBe(2);
    expect(result.current.estimatedTotalCoins).toBe(200);
    expect(screen.getByText("Mascote 2 entrou no carrinho.")).toBeInTheDocument();

    act(() => result.current.toggle(product(1, 120)));
    expect(result.current.has(1)).toBe(false);
    expect(screen.getByText("Mascote 1 saiu do carrinho.")).toBeInTheDocument();

    act(() => result.current.remove(2));
    expect(result.current.lines).toEqual([]);
  });

  it("esconde o que já foi adotado ou está aguardando pagamento", async () => {
    localStorage.setItem(
      "devland-cart",
      JSON.stringify([1, 2, 3].map((id) => ({ ...product(id, 10), productId: id }))),
    );
    localStorage.setItem("devland-orders", JSON.stringify(["pago", "pendente"]));
    vi.mocked(getOrder).mockImplementation(
      async (id) =>
        ({
          id,
          status: id === "pago" ? "paid" : "awaiting_payment",
          items: [
            {
              productId: id === "pago" ? 1 : 2,
              productName: "",
              unitPriceCoins: 10,
              quantity: 1,
              subtotalCoins: 10,
            },
          ],
          totalCoins: 10,
          createdAt: "2026-11-07T10:00:00.000Z",
          paidAt: null,
        }) as Order,
    );
    const { result } = renderHook(() => useCart(), { wrapper });
    await waitFor(() => expect(result.current.lines.map((line) => line.productId)).toEqual([3]));
  });
});
