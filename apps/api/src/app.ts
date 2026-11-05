import Fastify, { type FastifyInstance } from "fastify";

// A construção do app fica separada do listen para que os testes usem app.inject() sem abrir porta.
export function buildApp(): FastifyInstance {
  const app = Fastify({ logger: process.env.NODE_ENV !== "test" });

  app.get("/health", async () => ({ status: "ok" }));

  return app;
}
