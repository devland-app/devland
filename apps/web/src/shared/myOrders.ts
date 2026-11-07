import { readStored, writeStored } from "./storage.ts";

// Sem login, "Meus pedidos" são os códigos guardados neste navegador. O código (UUID) é o que dá
// acesso ao pedido na API, então ele só fica aqui, nunca vai para outro lugar.
const STORAGE_KEY = "devland-orders";
const MAX_REMEMBERED = 50;

function isIdList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

export function readMyOrderIds(): string[] {
  return readStored(STORAGE_KEY, isIdList, []);
}

export function rememberOrder(id: string): void {
  const ids = readMyOrderIds().filter((existing) => existing !== id);
  writeStored(STORAGE_KEY, [id, ...ids].slice(0, MAX_REMEMBERED));
}
