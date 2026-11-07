import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import type { FastifyInstance } from "fastify";

import { buildApp } from "../../src/app.js";
import { migrations } from "../../src/migrations.js";
import { createDatabase, runMigrations, type Database } from "../../src/shared/database.js";

export const FRONT_ORIGIN = "http://localhost:5173";

export interface Harness {
  app: FastifyInstance;
  db: Database;
  container: StartedPostgreSqlContainer;
  close(): Promise<void>;
}

// Um Postgres de verdade, descartável, com as mesmas migrations da produção. Cada arquivo de teste
// sobe o seu: nada depende do banco de desenvolvimento nem do que outro teste deixou.
export async function startDatabase(): Promise<{
  db: Database;
  container: StartedPostgreSqlContainer;
}> {
  const container = await new PostgreSqlContainer("postgres:17-alpine").start();
  return { db: createDatabase(container.getConnectionUri()), container };
}

export async function startHarness(): Promise<Harness> {
  const { db, container } = await startDatabase();
  await runMigrations(db, migrations);
  const app = await buildApp({ logger: false, db, corsOrigins: [FRONT_ORIGIN] });
  return {
    app,
    db,
    container,
    async close() {
      await app.close();
      await db.destroy();
      await container.stop();
    },
  };
}
