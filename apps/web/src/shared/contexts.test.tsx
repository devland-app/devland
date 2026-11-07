import { act, render, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useCart } from "./cart/cartContext.ts";
import { readMyOrderIds, rememberOrder } from "./myOrders.ts";
import { useSound } from "./sound/soundContext.ts";
import { SoundProvider } from "./sound/SoundProvider.tsx";
import { useWallet } from "./wallet/walletContext.ts";

vi.mock("./sound/synth.ts", () => ({ playSound: vi.fn() }));
const { playSound } = await import("./sound/synth.ts");

describe("contextos compartilhados", () => {
  afterEach(() => {
    vi.mocked(playSound).mockClear();
  });

  it.each([
    ["useCart", useCart, "<CartProvider>"],
    ["useWallet", useWallet, "<WalletProvider>"],
    ["useSound", useSound, "<SoundProvider>"],
  ])("%s fora do provider avisa qual provider falta", (_name, hook, provider) => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    function Orphan() {
      hook();
      return null;
    }
    expect(() => render(<Orphan />)).toThrow(provider);
    spy.mockRestore();
  });

  it("o som começa desligado, só toca ligado e a escolha fica salva", () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <SoundProvider>{children}</SoundProvider>
    );
    const { result } = renderHook(() => useSound(), { wrapper });
    expect(result.current.enabled).toBe(false);
    act(() => result.current.play("coin"));
    expect(playSound).not.toHaveBeenCalled();

    act(() => result.current.toggle());
    expect(result.current.enabled).toBe(true);
    expect(playSound).toHaveBeenCalledWith("pop");
    act(() => result.current.play("coin"));
    expect(playSound).toHaveBeenLastCalledWith("coin");
    expect(localStorage.getItem("devland-sound")).toBe("true");

    act(() => result.current.toggle());
    expect(localStorage.getItem("devland-sound")).toBe("false");
  });
});

describe("códigos dos pedidos neste navegador", () => {
  it("guarda o mais recente primeiro, sem repetir", () => {
    rememberOrder("a");
    rememberOrder("b");
    rememberOrder("a");
    expect(readMyOrderIds()).toEqual(["a", "b"]);
  });

  it("guarda no máximo 50 códigos", () => {
    for (let index = 0; index < 60; index += 1) rememberOrder(`pedido-${index}`);
    const ids = readMyOrderIds();
    expect(ids).toHaveLength(50);
    expect(ids[0]).toBe("pedido-59");
  });
});
