import type { FastifyInstance } from "fastify";

import type { Database } from "../../shared/database.js";
import { KnexOrderRepository } from "./orders.repository.js";
import { registerOrderRoutes } from "./orders.routes.js";
import { OrdersService, type ProductLookup } from "./orders.service.js";

// API pública do módulo de pedidos: é a única porta de entrada para o resto da aplicação.
export { ordersMigrations } from "./orders.migrations.js";

export interface OrdersModule {
  service: OrdersService;
  registerRoutes(app: FastifyInstance): void;
}

// Composição do módulo. O catálogo chega de fora (orders → catalog, nunca o contrário) e entra
// como ProductLookup: os pedidos dependem só do formato de que precisam, não do módulo inteiro.
export function createOrdersModule(db: Database, catalog: ProductLookup): OrdersModule {
  const service = new OrdersService(new KnexOrderRepository(db), catalog);
  return {
    service,
    registerRoutes(app) {
      registerOrderRoutes(app, service);
    },
  };
}
