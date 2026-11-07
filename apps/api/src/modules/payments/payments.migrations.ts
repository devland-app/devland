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
      // Recibo de mentirinha mostrado na tela; só pagamentos aprovados têm um.
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

export const paymentsMigrations: Migration[] = [createPayments];
