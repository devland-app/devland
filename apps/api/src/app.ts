import Fastify, { type FastifyInstance } from "fastify";

import type { Database } from "./shared/database.js";

export interface AppOptions {
  // Nos testes o logger fica desligado para não poluir a saída.
  logger: boolean;
  db: Database;
}

// A construção do app fica separada do listen para que os testes usem app.inject() sem abrir porta.
export function buildApp(options: AppOptions): FastifyInstance {
  const app = Fastify({ logger: options.logger });

  // O healthcheck do Docker chama esta rota: se o banco não responde, a API também não está saudável.
  app.get("/health", async (request, reply) => {
    try {
      await options.db.raw("select 1");
      return { status: "ok", database: "ok" };
    } catch (error) {
      request.log.error(error, "banco de dados indisponível");
      return reply.code(503).send({ status: "error", database: "unavailable" });
    }
  });

  return app;
}
