import { act, render, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError, getOrder } from "../api/client.ts";
import type { Order } from "../api/types.ts";
import { useAdoptions } from "./adoptionsContext.ts";
import { AdoptionsProvider } from "./AdoptionsProvider.tsx";

vi.mock("../api/client.ts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../api/client.ts")>()),
  getOrder: vi.fn(),
}));

function order(id: string, status: Order["status"], productIds: number[]): Order {
  return {
    id,
    status,
    items: productIds.map((productId) => ({
      productId,
      productName: `Mascote ${productId}`,
      unitPriceCoins: 10,
      quantity: 1,
      subtotalCoins: 10,
    })),
    totalCoins: 10 * productIds.length,
    createdAt: "2026-11-07T10:00:00.000Z",
    paidAt: status === "paid" ? "2026-11-07T11:00:00.000Z" : null,
  };
}

const wrapper = ({ children }: { children: ReactNode }) => (
  <AdoptionsProvider>{children}</AdoptionsProvider>
);

describe("AdoptionsProvider", () => {
  beforeEach(() => {
    vi.mocked(getOrder).mockReset();
  });

  it("monta a coleção a partir dos pedidos deste navegador", async () => {
    const orders = [
      order("pago", "paid", [1, 2]),
      order("pendente", "awaiting_payment", [3]),
      // Pendente com um mascote já adotado: pagá-lo adotaria o mesmo mascote duas vezes.
      order("repetido", "awaiting_payment", [1]),
    ];
    localStorage.setItem("devland-orders", JSON.stringify(orders.map((item) => item.id)));
    vi.mocked(getOrder).mockImplementation(
      async (id) => orders.find((item) => item.id === id) as Order,
    );

    const { result } = renderHook(() => useAdoptions(), { wrapper });
    expect(result.current.status).toBe("loading");
    await waitFor(() => expect(result.current.status).toBe("ready"));

    expect([...result.current.adopted.keys()]).toEqual([1, 2]);
    expect(result.current.adopted.get(1)).toEqual({
      orderId: "pago",
      adoptedAt: "2026-11-07T11:00:00.000Z",
    });
    expect(result.current.pendingOrders.map((item) => item.id)).toEqual(["pendente"]);
    expect(result.current.isPending(3)).toBe(true);
    expect(result.current.isPending(1)).toBe(false);
  });

  it("ignora pedidos que a API não conhece mais, sem quebrar a coleção", async () => {
    localStorage.setItem("devland-orders", JSON.stringify(["sumiu", "pago"]));
    vi.mocked(getOrder).mockImplementation(async (id) => {
      if (id === "sumiu") throw new ApiError(404, "Pedido não encontrado.");
      return order("pago", "paid", [5]);
    });
    const { result } = renderHook(() => useAdoptions(), { wrapper });
    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect([...result.current.adopted.keys()]).toEqual([5]);
  });

  it("atualiza na hora quando um pedido é criado e depois pago", async () => {
    const { result } = renderHook(() => useAdoptions(), { wrapper });
    await waitFor(() => expect(result.current.status).toBe("ready"));
    act(() => result.current.recordOrder(order("novo", "awaiting_payment", [7])));
    expect(result.current.isPending(7)).toBe(true);
    act(() => result.current.recordOrder(order("novo", "paid", [7])));
    expect(result.current.isPending(7)).toBe(false);
    expect(result.current.adopted.has(7)).toBe(true);
  });

  it("exige o provider em volta de quem usa", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    function Orphan() {
      useAdoptions();
      return null;
    }
    expect(() => render(<Orphan />)).toThrow(
      "useAdoptions precisa estar dentro de <AdoptionsProvider>",
    );
    spy.mockRestore();
  });
});
