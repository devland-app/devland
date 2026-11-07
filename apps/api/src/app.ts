import Fastify, { type FastifyInstance } from "fastify";

import { registerCatalogModule } from "./modules/catalog/index.js";
import { registerApiDocs } from "./shared/api-docs.js";
import type { Database } from "./shared/database.js";

const healthStatusSchema = {
  type: "object",
  required: ["status", "database"],
  properties: {
    status: { type: "string", enum: ["ok", "error"] },
    database: { type: "string", enum: ["ok", "unavailable"] },
  },
} as const;

const healthSchema = {
  tags: ["health"],
  summary: "Verifica se a API e o banco estão respondendo",
  response: {
    200: { description: "API e banco saudáveis", ...healthStatusSchema },
    503: { description: "Banco de dados indisponível", ...healthStatusSchema },
  },
} as const;

export interface AppOptions {
  // Nos testes o logger fica desligado para não poluir a saída.
  logger: boolean;
  db: Database;
}

// A construção do app fica separada do listen para que os testes usem app.inject() sem abrir porta.
export async function buildApp(options: AppOptions): Promise<FastifyInstance> {
  const app = Fastify({ logger: options.logger });

  // Precisa vir antes das rotas: o Swagger só documenta as rotas declaradas depois de carregado.
  await registerApiDocs(app);

  // O healthcheck do Docker chama esta rota: se o banco não responde, a API também não está saudável.
  app.get("/health", { schema: healthSchema }, async (request, reply) => {
    try {
      await options.db.raw("select 1");
      return { status: "ok", database: "ok" };
    } catch (error) {
      request.log.error(error, "banco de dados indisponível");
      return reply.code(503).send({ status: "error", database: "unavailable" });
    }
  });

  registerCatalogModule(app, options.db);

  return app;
}
