import cors from "@fastify/cors";
import Fastify, { type FastifyError, type FastifyInstance } from "fastify";

import { createCatalogModule } from "./modules/catalog/index.js";
import { createOrdersModule } from "./modules/orders/index.js";
import { createPaymentsModule } from "./modules/payments/index.js";
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
  operationId: "getHealth",
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
  // Origens do front autorizadas a chamar a API pelo navegador.
  corsOrigins: string[];
}

// A construção do app fica separada do listen para que os testes usem app.inject() sem abrir porta.
export async function buildApp(options: AppOptions): Promise<FastifyInstance> {
  const app = Fastify({
    logger: options.logger,
    // Por padrão o Fastify apaga em silêncio os campos que o schema não conhece. Aqui eles são
    // rejeitados (400): um cliente que mande, por exemplo, "priceCents" descobre na hora que não pode.
    ajv: { customOptions: { removeAdditional: false } },
  });

  // Erros inesperados (5xx) viram uma mensagem genérica: detalhes internos, como o nome do host do
  // banco ou o texto de um erro de SQL, ficam só no log. Erros 4xx (ex.: validação) seguem iguais.
  app.setErrorHandler<FastifyError>((error, request, reply) => {
    const statusCode = error.statusCode ?? 500;
    if (statusCode >= 500) {
      request.log.error(error);
      return reply
        .code(statusCode)
        .send({ message: "Erro interno. Tente novamente em instantes." });
    }
    return reply.send(error);
  });

  // Só o front conhecido pode chamar a API pelo navegador. O header exposto permite ao front saber
  // quando uma resposta foi repetida por idempotência.
  await app.register(cors, {
    origin: options.corsOrigins,
    exposedHeaders: ["Idempotent-Replayed"],
  });

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

  const catalog = createCatalogModule(options.db);
  catalog.registerRoutes(app);

  const payments = createPaymentsModule(options.db);
  const orders = createOrdersModule(options.db, catalog.service, payments.service);
  orders.registerRoutes(app);

  return app;
}
