import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";

import Fastify, { type FastifyInstance } from "fastify";
import { describe, expect, it, vi } from "vitest";

import { createVercelHandler, stripApiPrefix, toApiUrl } from "../../src/vercel.js";

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
  // Como a lista de quizzes: recusa parâmetros desconhecidos.
  app.get(
    "/strict",
    {
      schema: {
        querystring: {
          type: "object",
          additionalProperties: false,
          properties: { a: { type: "string" } },
        },
      },
    },
    async (request) => request.query,
  );
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

describe("toApiUrl", () => {
  it.each([
    // O que a regra /api/:path* da Vercel entrega, e o que a API precisa receber.
    ["/api/quizzes?path=quizzes", "/quizzes"],
    ["/api/quizzes?walletId=abc&path=quizzes", "/quizzes?walletId=abc"],
    [
      "/api/images/mascots/castor.svg?v=1a2b&path=images%2Fmascots%2Fcastor.svg",
      "/images/mascots/castor.svg?v=1a2b",
    ],
    [
      "/api/images/mascots/castor.svg?v=1&path=images&path=mascots&path=castor.svg",
      "/images/mascots/castor.svg?v=1",
    ],
    ["/api/products?path=products", "/products"],
    // Um "path" que não é o caminho da requisição é um parâmetro de verdade: fica.
    ["/api/quizzes?path=outra-coisa", "/quizzes?path=outra-coisa"],
    ["/api/quizzes?walletId=abc", "/quizzes?walletId=abc"],
    ["/api/health", "/health"],
    ["/api/%E0%A4%A?path=x", "/%E0%A4%A?path=x"],
  ])("%s vira %s", (url, expected) => {
    expect(toApiUrl(url)).toBe(expected);
  });
});

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
      const strict = await fetch(server.url("/api/strict?a=1&path=strict"));
      expect(strict.status).toBe(200);
      expect(await strict.json()).toEqual({ a: "1" });
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
