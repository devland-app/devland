import type { FastifyInstance } from "fastify";

import { createTransactionRunner, type Database } from "../../shared/database.js";
import { KnexOrderRepository } from "./orders.repository.js";
import { registerOrderRoutes } from "./orders.routes.js";
import { OrdersService, type PaymentProcessor, type ProductLookup } from "./orders.service.js";

// API pública do módulo de pedidos: é a única porta de entrada para o resto da aplicação.
export { ordersMigrations } from "./orders.migrations.js";

export interface OrdersModule {
  service: OrdersService;
  registerRoutes(app: FastifyInstance): void;
}

// Composição do módulo. Catálogo e pagamentos chegam de fora (orders → catalog, orders → payments,
// nunca o contrário) e entram como interfaces: os pedidos dependem só do que usam.
export function createOrdersModule(
  db: Database,
  catalog: ProductLookup,
  payments: PaymentProcessor,
): OrdersModule {
  const service = new OrdersService(
    new KnexOrderRepository(db),
    catalog,
    payments,
    createTransactionRunner(db),
  );
  return {
    service,
    registerRoutes(app) {
      registerOrderRoutes(app, service);
    },
  };
}
