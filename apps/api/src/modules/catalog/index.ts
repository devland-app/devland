import type { FastifyInstance } from "fastify";

import type { Database } from "../../shared/database.js";
import { registerMascotImages } from "./catalog.images.js";
import { KnexProductRepository } from "./catalog.repository.js";
import { registerCatalogRoutes } from "./catalog.routes.js";
import { CatalogService } from "./catalog.service.js";

// API pública do módulo de catálogo: é a única porta de entrada para o resto da aplicação.
export { catalogMigrations } from "./catalog.migrations.js";
export { OutOfStockError } from "./catalog.service.js";
export type { CatalogService } from "./catalog.service.js";
export type { Product } from "./catalog.types.js";

export interface CatalogModule {
  // Leitura de produtos para outros módulos (ex.: pedidos), sem acesso direto à tabela.
  service: CatalogService;
  registerRoutes(app: FastifyInstance): void;
}

// Composição do módulo: o repository concreto é criado aqui e injetado no service (inversão de
// dependência). Quem está fora do módulo não sabe que existe Knex por trás.
export function createCatalogModule(db: Database): CatalogModule {
  const service = new CatalogService(new KnexProductRepository(db));
  return {
    service,
    registerRoutes(app) {
      registerCatalogRoutes(app, service);
      registerMascotImages(app);
    },
  };
}
