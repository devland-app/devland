import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";

import Fastify, { type FastifyInstance } from "fastify";
import { describe, expect, it, vi } from "vitest";

import { createVercelHandler, stripApiPrefix } from "../../src/vercel.js";

describe("stripApiPrefix", () => {
  it.each([
    ["/api/products", "/products"],
    ["/api/products?walletId=1", "/products?walletId=1"],
    ["/api", "/"],
    ["/api/", "/"],
    ["/api?x=1", "/?x=1"],
    ["/apiary", "/apiary"],
    ["/products", "/products"],
  ])("%s vira %s", (url, expected) => {
    expect(stripApiPrefix(url)).toBe(expected);
  });
});

function fakeApp(): FastifyInstance {
  const app = Fastify();
  app.get("/products", async () => ({ ok: true }));
  return app;
}

async function serve(handler: (req: IncomingMessage, res: ServerResponse) => Promise<void>) {
  const server = createServer((request, response) => void handler(request, response));
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  return {
    url: (path: string) => `http://127.0.0.1:${port}${path}`,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}

describe("createVercelHandler", () => {
  it("entrega /api/... ao app sem o prefixo e monta o app uma vez só", async () => {
    const factory = vi.fn(async () => fakeApp());
    const server = await serve(createVercelHandler(factory));
    try {
      const first = await fetch(server.url("/api/products"));
      const second = await fetch(server.url("/api/products"));
      expect(first.status).toBe(200);
      expect(await second.json()).toEqual({ ok: true });
      expect((await fetch(server.url("/api/nao-existe"))).status).toBe(404);
      expect(factory).toHaveBeenCalledTimes(1);
    } finally {
      await server.close();
    }
  });

  it("se a montagem falha, a próxima requisição tenta montar de novo", async () => {
    const factory = vi
      .fn<() => Promise<FastifyInstance>>()
      .mockRejectedValueOnce(new Error("Configuração inválida"))
      .mockImplementation(async () => fakeApp());
    const handler = createVercelHandler(factory);
    const request = { url: "/api/products" } as IncomingMessage;
    await expect(handler(request, {} as ServerResponse)).rejects.toThrow("Configuração inválida");

    const server = await serve(handler);
    try {
      expect((await fetch(server.url("/api/products"))).status).toBe(200);
      expect(factory).toHaveBeenCalledTimes(2);
    } finally {
      await server.close();
    }
  });
});
