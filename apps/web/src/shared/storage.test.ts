import { afterEach, describe, expect, it, vi } from "vitest";

import { readStored, writeStored } from "./storage.ts";

const isNumberList = (value: unknown): value is number[] =>
  Array.isArray(value) && value.every((item) => typeof item === "number");

describe("localStorage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("grava e lê de volta o que é válido", () => {
    writeStored("chave", [1, 2]);
    expect(readStored("chave", isNumberList, [])).toEqual([1, 2]);
  });

  it("usa o valor padrão quando não há nada, o JSON quebrou ou o formato é antigo", () => {
    expect(readStored("vazia", isNumberList, [7])).toEqual([7]);
    localStorage.setItem("quebrada", "{nao é json");
    expect(readStored("quebrada", isNumberList, [7])).toEqual([7]);
    localStorage.setItem("antiga", JSON.stringify({ priceCents: 4990 }));
    expect(readStored("antiga", isNumberList, [7])).toEqual([7]);
  });

  it("não derruba a página quando o armazenamento está bloqueado", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("bloqueado");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("bloqueado");
    });
    expect(() => writeStored("chave", [1])).not.toThrow();
    expect(readStored("chave", isNumberList, [])).toEqual([]);
  });
});
