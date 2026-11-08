import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { migrations } from "../../src/migrations.js";
import { rollbackMigrations, runMigrations, type Database } from "../../src/shared/database.js";
import { startDatabase } from "./harness.js";

const MODULE_TABLES = [
  "products",
  "orders",
  "order_items",
  "payments",
  "wallets",
  "wallet_entries",
  "quiz_attempts",
  "quiz_answers",
];

async function existingTables(db: Database): Promise<string[]> {
  const rows = await db("information_schema.tables")
    .where({ table_schema: "public" })
    .whereIn("table_name", MODULE_TABLES)
    .select<Array<{ table_name: string }>>("table_name");
  return rows.map((row) => row.table_name).sort();
}

// Um rollback de versão depende de cada "down" desfazer o seu "up". Este teste sobe tudo, desce
// tudo e sobe de novo, num banco vazio.
describe("migrations", () => {
  let database: Awaited<ReturnType<typeof startDatabase>>;

  beforeAll(async () => {
    database = await startDatabase();
  });

  afterAll(async () => {
    await database?.db.destroy();
    await database?.container.stop();
  });

  it("sobem, descem e sobem de novo sem erro", async () => {
    const { db } = database;
    const applied = await runMigrations(db, migrations);
    expect(applied).toEqual(migrations.map((migration) => migration.name));
    expect(await existingTables(db)).toEqual([...MODULE_TABLES].sort());

    const reverted = await rollbackMigrations(db, migrations);
    expect(reverted).toHaveLength(migrations.length);
    expect(await existingTables(db)).toEqual([]);

    expect(await runMigrations(db, migrations)).toHaveLength(migrations.length);
    const products = await db("products").count<Array<{ count: string }>>({ count: "*" });
    expect(Number(products[0]?.count)).toBe(9);
  });
});
