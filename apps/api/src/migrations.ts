import { catalogMigrations } from "./modules/catalog/index.js";
import { ordersMigrations } from "./modules/orders/index.js";
import { paymentsMigrations } from "./modules/payments/index.js";
import { quizzesMigrations } from "./modules/quizzes/index.js";
import { walletsMigrations } from "./modules/wallets/index.js";
import type { Migration } from "./shared/database.js";

// Ordem de criação, e não agrupada por módulo. O Knex aplica as pendentes nesta ordem e, num
// "migrate.down", desfaz a última desta lista que estiver aplicada. Agrupadas por módulo, um down
// depois de "payments_002" desfaria "payments_001" (apagando a tabela de pagamentos) antes de
// "catalog_008" e "orders_002", que são mais novas. Migration nova entra no fim desta lista.
const CREATION_ORDER = [
  "catalog_001_create_products",
  "catalog_002_insert_initial_products",
  "catalog_003_add_product_images",
  "catalog_004_raise_stock_for_collections",
  "catalog_005_add_mascot_lessons",
  "catalog_006_rewrite_descriptions",
  "orders_001_create_orders",
  "payments_001_create_payments",
  "catalog_007_rename_to_devland",
  "catalog_008_price_in_coins",
  "orders_002_amounts_in_coins",
  "payments_002_pay_with_coins",
  "wallets_001_create_wallets",
  "quizzes_001_create_attempts",
  "catalog_009_add_infrastructure_mascot",
  "catalog_010_refresh_project_lessons",
];

const byName = new Map(
  [
    ...catalogMigrations,
    ...ordersMigrations,
    ...paymentsMigrations,
    ...walletsMigrations,
    ...quizzesMigrations,
  ].map((migration) => [migration.name, migration]),
);

// A API não sobe se um módulo tiver migration fora da lista (ou a lista citar uma que não existe):
// melhor falhar na subida do que pular uma migration em produção.
const missing = [...byName.keys()].filter((name) => !CREATION_ORDER.includes(name));
const unknown = CREATION_ORDER.filter((name) => !byName.has(name));
if (missing.length > 0 || unknown.length > 0) {
  throw new Error(
    `Lista de migrations desatualizada. Fora da lista: ${missing.join(", ") || "nenhuma"}. ` +
      `Inexistentes: ${unknown.join(", ") || "nenhuma"}.`,
  );
}

export const migrations: Migration[] = CREATION_ORDER.map((name) => byName.get(name) as Migration);
