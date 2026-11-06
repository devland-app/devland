import Fastify, { type FastifyInstance } from "fastify";

export interface AppOptions {
  // Nos testes o logger fica desligado para não poluir a saída.
  logger: boolean;
}

// A construção do app fica separada do listen para que os testes usem app.inject() sem abrir porta.
export function buildApp(options: AppOptions): FastifyInstance {
  const app = Fastify({ logger: options.logger });

  app.get("/health", async () => ({ status: "ok" }));

  return app;
}
