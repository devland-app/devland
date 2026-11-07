// O Knex é um pacote CommonJS: em ESM só o import padrão funciona em execução. O import nomeado
// passa no TypeScript, mas o Node falha com "Named export 'knex' not found".
import knex from "knex";
import type { Knex } from "knex";

// Knex é o query builder do projeto: monta SQL parametrizado (sem concatenar strings) e controla
// as migrations. Os módulos recebem a instância por injeção; nenhum deles cria a própria conexão.
export type Database = Knex;

// Transação aberta por quem coordena um caso de uso que mexe em várias tabelas (Unit of Work). Os
// services só a repassam aos repositories, que são os únicos que sabem usá-la.
export type Transaction = Knex.Transaction;
export type TransactionRunner = <T>(work: (trx: Transaction) => Promise<T>) => Promise<T>;

export function createTransactionRunner(db: Database): TransactionRunner {
  return (work) => db.transaction(work);
}

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

// Desfaz todas as migrations aplicadas, da mais nova para a mais antiga. Os testes usam para
// garantir que cada "down" realmente desfaz o seu "up" (o caminho de um rollback de versão).
export async function rollbackMigrations(db: Database, migrations: Migration[]): Promise<string[]> {
  const [, reverted] = await db.migrate.rollback({ migrationSource: listSource(migrations) }, true);
  return reverted;
}

function listSource(migrations: Migration[]): Knex.MigrationSource<Migration> {
  return {
    getMigrations: async () => migrations,
    getMigrationName: (migration) => migration.name,
    getMigration: async (migration) => migration,
  };
}
