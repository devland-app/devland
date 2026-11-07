import type { Migration } from "../../shared/database.js";

// O módulo de carteiras é dono das tabelas "wallets" e "wallet_entries".
const createWallets: Migration = {
  name: "wallets_001_create_wallets",
  async up(db) {
    await db.schema.createTable("wallets", (table) => {
      // UUID e não sequencial, como nos pedidos: o código é o que dá acesso à carteira.
      table.uuid("id").primary();
      table.integer("balance_coins").notNullable().defaultTo(0);
      table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(db.fn.now());

      // Última barreira contra saldo negativo, mesmo que uma regra do código falhe.
      table.check("?? >= 0", ["balance_coins"], "wallets_balance_not_negative");
    });

    // Extrato: cada crédito e débito vira uma linha. O saldo da carteira é a soma delas, guardada
    // pronta para não precisar somar o extrato a cada consulta.
    await db.schema.createTable("wallet_entries", (table) => {
      table.bigIncrements("id");
      table
        .uuid("wallet_id")
        .notNullable()
        .references("id")
        .inTable("wallets")
        .onDelete("CASCADE")
        .index();
      table.integer("amount_coins").notNullable();
      table.string("reason", 30).notNullable();
      table.string("reference", 100).notNullable();
      table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(db.fn.now());

      table.check("?? <> 0", ["amount_coins"], "wallet_entries_amount_not_zero");
      table.check(
        "?? in ('quiz_answer', 'order_payment')",
        ["reason"],
        "wallet_entries_reason_valid",
      );
      table.unique(["reason", "reference"], { indexName: "wallet_entries_one_per_reference" });
    });
  },
  async down(db) {
    await db.schema.dropTable("wallet_entries");
    await db.schema.dropTable("wallets");
  },
};

export const walletsMigrations: Migration[] = [createWallets];
