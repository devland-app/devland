import type { FastifyInstance } from "fastify";

import type { Database } from "../../shared/database.js";
import { KnexProductRepository } from "./catalog.repository.js";
import { registerCatalogRoutes } from "./catalog.routes.js";
import { CatalogService } from "./catalog.service.js";

// API pública do módulo de catálogo: é a única porta de entrada para o resto da aplicação.
export { catalogMigrations } from "./catalog.migrations.js";

// Composição do módulo: o repository concreto é criado aqui e injetado no service (inversão de
// dependência). Quem está fora do módulo não sabe que existe Knex por trás.
export function registerCatalogModule(app: FastifyInstance, db: Database): void {
  const service = new CatalogService(new KnexProductRepository(db));
  registerCatalogRoutes(app, service);
}
