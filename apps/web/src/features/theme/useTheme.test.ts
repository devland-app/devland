import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useTheme } from "./useTheme.ts";

// Simula o "prefers-color-scheme" do sistema, com o evento de mudança.
function stubSystemTheme(dark: boolean) {
  const listeners: Array<() => void> = [];
  const query = {
    matches: dark,
    addEventListener: (_event: string, listener: () => void) => listeners.push(listener),
    removeEventListener: () => {},
  };
  vi.stubGlobal("matchMedia", () => query);
  return {
    change(next: boolean) {
      query.matches = next;
      listeners.forEach((listener) => listener());
    },
  };
}

describe("useTheme", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("sem escolha, segue o tema do sistema e acompanha a mudança", () => {
    const system = stubSystemTheme(true);
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe("dark");
    act(() => system.change(false));
    expect(result.current.theme).toBe("light");
  });

  it("depois de escolher, a escolha vale mais que o sistema", () => {
    const system = stubSystemTheme(false);
    const { result } = renderHook(() => useTheme());
    act(() => result.current.toggleTheme());
    expect(result.current.theme).toBe("dark");
    act(() => system.change(false));
    expect(result.current.theme).toBe("dark");
  });

  it("sem armazenamento disponível, a troca de tema continua funcionando", () => {
    stubSystemTheme(false);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("bloqueado");
    });
    const { result } = renderHook(() => useTheme());
    act(() => result.current.toggleTheme());
    expect(document.documentElement.dataset.theme).toBe("dark");
  });
});
