import type { Migration } from "../../shared/database.js";

// O módulo de pagamentos é dono da tabela "payments". Cada tentativa vira uma linha, aprovada ou
// recusada: o histórico mostra quantas vezes alguém tentou "pagar" com o cartão sem saldo.
const createPayments: Migration = {
  name: "payments_001_create_payments",
  async up(db) {
    await db.schema.createTable("payments", (table) => {
      table.uuid("id").primary();
      // Referência ao pedido sem foreign key: "orders" é tabela de outro módulo.
      table.uuid("order_id").notNullable().index();
      table.string("method", 30).notNullable();
      table.string("status", 20).notNullable();
      table.integer("amount_cents").notNullable();
      // Recibo simulado mostrado na tela; só pagamentos aprovados têm um.
      table.string("receipt_code", 20);
      table.string("decline_reason", 200);
      table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(db.fn.now());

      table.check(
        "?? in ('pix', 'toy_card', 'broke_toy_card')",
        ["method"],
        "payments_method_valid",
      );
      table.check("?? in ('approved', 'declined')", ["status"], "payments_status_valid");
      table.check("?? > 0", ["amount_cents"], "payments_amount_cents_positive");
    });
    // No máximo um pagamento aprovado por pedido, garantido pelo banco: nem uma corrida entre duas
    // requisições consegue "cobrar" o mesmo pedido duas vezes.
    await db.raw(
      "create unique index payments_one_approved_per_order on payments (order_id) where status = 'approved'",
    );
  },
  async down(db) {
    await db.schema.dropTable("payments");
  },
};

// Pagamentos passam a ser feitos com moedas de uma carteira. As formas simuladas antigas continuam
// válidas no banco para o histórico; valores em centavos viram moedas (uma moeda por real).
const payWithCoins: Migration = {
  name: "payments_002_pay_with_coins",
  async up(db) {
    await db.schema.alterTable("payments", (table) => {
      table.renameColumn("amount_cents", "amount_coins");
      // Referência à carteira sem foreign key: "wallets" é tabela de outro módulo.
      table.uuid("wallet_id").index();
      table.dropChecks(["payments_method_valid", "payments_amount_cents_positive"]);
    });
    await db("payments").update({
      amount_coins: db.raw("greatest(1, round(amount_coins / 100.0))"),
    });
    // CHECK em SQL direto: dentro de um alterTable, o table.check do Knex monta a query errada.
    await db.raw(
      "alter table payments add constraint payments_method_valid " +
        "check (method in ('coins', 'pix', 'toy_card', 'broke_toy_card'))",
    );
    await db.raw(
      "alter table payments add constraint payments_amount_coins_positive check (amount_coins > 0)",
    );
  },
  async down(db) {
    await db("payments").where({ method: "coins" }).delete();
    await db.schema.alterTable("payments", (table) => {
      table.dropChecks(["payments_method_valid", "payments_amount_coins_positive"]);
      table.dropColumn("wallet_id");
      table.renameColumn("amount_coins", "amount_cents");
    });
    await db("payments").update({ amount_cents: db.raw("amount_cents * 100") });
    await db.raw(
      "alter table payments add constraint payments_method_valid " +
        "check (method in ('pix', 'toy_card', 'broke_toy_card'))",
    );
    await db.raw(
      "alter table payments add constraint payments_amount_cents_positive check (amount_cents > 0)",
    );
  },
};

export const paymentsMigrations: Migration[] = [createPayments, payWithCoins];
