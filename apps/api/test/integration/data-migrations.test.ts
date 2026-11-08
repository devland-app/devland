import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { migrations } from "../../src/migrations.js";
import { runMigrations, type Database, type Migration } from "../../src/shared/database.js";
import { startDatabase } from "./harness.js";

// As migrations de dados precisam funcionar sobre um banco que já tinha dados do formato antigo
// (preços em centavos, pagamento com Pix, textos com o nome DevZoo), e não só num banco vazio.

// Estado antes da troca de nome e das moedas: catálogo até a 006, pedidos e pagamentos originais.
const LEGACY_NAMES = new Set([
  "catalog_001_create_products",
  "catalog_002_insert_initial_products",
  "catalog_003_add_product_images",
  "catalog_004_raise_stock_for_collections",
  "catalog_005_add_mascot_lessons",
  "catalog_006_rewrite_descriptions",
  "orders_001_create_orders",
  "payments_001_create_payments",
]);

describe("migrations de dados", () => {
  let database: Awaited<ReturnType<typeof startDatabase>>;
  let db: Database;
  const orderId = randomUUID();

  beforeAll(async () => {
    database = await startDatabase();
    db = database.db;
    const legacy = migrations.filter((migration) => LEGACY_NAMES.has(migration.name));
    expect(legacy).toHaveLength(LEGACY_NAMES.size);
    await runMigrations(db, legacy);

    // Dados como estavam na v0.2.0: um pedido pago com Pix, em centavos.
    const crab = await db("products").where({ slug: "caranguejo-dos-conteineres" }).first();
    await db("products")
      .where({ id: crab.id })
      .update({ lesson_in_devzoo: "A DevZoo inteira roda em contêineres." });
    await db("orders").insert({
      id: orderId,
      idempotency_key: "pedido-legado-1",
      status: "paid",
      total_cents: 9480,
    });
    await db("order_items").insert([
      {
        order_id: orderId,
        product_id: crab.id,
        product_name: crab.name,
        unit_price_cents: 4990,
        quantity: 1,
      },
      {
        order_id: orderId,
        product_id: crab.id + 1,
        product_name: "Lesminha do Pipeline",
        unit_price_cents: 4490,
        quantity: 1,
      },
    ]);
    await db("payments").insert({
      id: randomUUID(),
      order_id: orderId,
      method: "pix",
      status: "approved",
      amount_cents: 9480,
      receipt_code: "DZ-LEGADO1",
    });
  });

  afterAll(async () => {
    await db?.destroy();
    await database?.container.stop();
  });

  it("converte o formato antigo para o novo, preservando o histórico", async () => {
    await runMigrations(db, migrations);

    const crab = await db("products").where({ slug: "caranguejo-dos-conteineres" }).first();
    expect(crab.price_coins).toBe(120);
    expect(crab.lesson_in_project).toBe("A DevLand inteira roda em contêineres.");

    const items = await db("order_items").where({ order_id: orderId }).orderBy("unit_price_coins");
    expect(items.map((item: { unit_price_coins: number }) => item.unit_price_coins)).toEqual([
      45, 50,
    ]);
    const legacyOrder = await db("orders").where({ id: orderId }).first();
    expect(legacyOrder.total_coins).toBe(95);

    const payment = await db("payments").where({ order_id: orderId }).first();
    expect(payment).toMatchObject({ method: "pix", amount_coins: 95, wallet_id: null });

    // A lição do castor passa a contar o cache da CDN, e não o do nginx de antes do deploy.
    const beaver = await db("products").where({ slug: "castor-do-cache" }).first();
    expect(beaver.lesson_in_project).toContain("CDN");
  });

  it("desfaz as migrations novas uma a uma, devolvendo os dados ao formato antigo", async () => {
    const source = {
      getMigrations: async () => migrations,
      getMigrationName: (migration: Migration) => migration.name,
      getMigration: async (migration: Migration) => migration,
    };
    const newer = migrations.length - LEGACY_NAMES.size;
    for (let step = 0; step < newer; step += 1) {
      await db.migrate.down({ migrationSource: source });
    }

    const crab = await db("products").where({ slug: "caranguejo-dos-conteineres" }).first();
    expect(crab.price_cents).toBe(4990);
    const beaver = await db("products").where({ slug: "castor-do-cache" }).first();
    expect(beaver.lesson_in_devzoo).toContain("O nginx da DevZoo");
    expect(crab.lesson_in_devzoo).toBe("A DevZoo inteira roda em contêineres.");
    expect(crab).not.toHaveProperty("price_coins");

    // Moedas voltam a centavos multiplicando por 100: o valor original arredondado não volta.
    const legacyOrder = await db("orders").where({ id: orderId }).first();
    expect(legacyOrder.total_cents).toBe(9500);
    const payment = await db("payments").where({ order_id: orderId }).first();
    expect(payment).toMatchObject({ method: "pix", amount_cents: 9500 });
    expect(payment).not.toHaveProperty("wallet_id");

    const tables = await db("information_schema.tables")
      .whereIn("table_name", ["wallets", "wallet_entries", "quiz_attempts", "quiz_answers"])
      .pluck("table_name");
    expect(tables).toEqual([]);
  });
});
