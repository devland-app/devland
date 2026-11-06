// O Knex é um pacote CommonJS: em ESM só o import padrão funciona em execução. O import nomeado
// passa no TypeScript, mas o Node falha com "Named export 'knex' not found".
import knex from "knex";
import type { Knex } from "knex";

// Knex é o query builder do projeto: monta SQL parametrizado (sem concatenar strings) e controla
// as migrations. Os módulos recebem a instância por injeção; nenhum deles cria a própria conexão.
export type Database = Knex;

export function createDatabase(databaseUrl: string): Database {
  return knex({
    client: "pg",
    connection: databaseUrl,
    // min 0: conexões ociosas são fechadas, o que evita erros quando o banco reinicia.
    pool: { min: 0, max: 10 },
  });
}

// Uma migration é um objeto TypeScript, não um arquivo solto numa pasta: funciona igual com tsx
// em dev e com o JavaScript compilado em produção. Cada módulo exporta a lista das suas tabelas.
export interface Migration {
  name: string;
  up(db: Database): Promise<void>;
  down(db: Database): Promise<void>;
}

export async function runMigrations(db: Database, migrations: Migration[]): Promise<string[]> {
  const [, applied] = await db.migrate.latest({ migrationSource: listSource(migrations) });
  return applied;
}

function listSource(migrations: Migration[]): Knex.MigrationSource<Migration> {
  return {
    getMigrations: async () => migrations,
    getMigrationName: (migration) => migration.name,
    getMigration: async (migration) => migration,
  };
}
