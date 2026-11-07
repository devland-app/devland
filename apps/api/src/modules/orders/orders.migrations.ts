import type { Migration } from "../../shared/database.js";

// O módulo de pedidos é dono das tabelas "orders" e "order_items".
const createOrders: Migration = {
  name: "orders_001_create_orders",
  async up(db) {
    await db.schema.createTable("orders", (table) => {
      // UUID, e não 1, 2, 3: a loja não tem login, então quem tem o ID vê o pedido. Com IDs
      // sequenciais, bastaria trocar o número na URL para ver o pedido dos outros (IDOR).
      table.uuid("id").primary();
      // A mesma chave enviada de novo (clique duplo, retry da rede) devolve o pedido já criado.
      table.string("idempotency_key", 100).notNullable().unique();
      table.string("status", 30).notNullable();
      table.integer("total_cents").notNullable();
      table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(db.fn.now());
      table.timestamp("paid_at", { useTz: true });

      table.check("?? in ('awaiting_payment', 'paid')", ["status"], "orders_status_valid");
      table.check("?? > 0", ["total_cents"], "orders_total_cents_positive");
    });

    await db.schema.createTable("order_items", (table) => {
      table.uuid("order_id").notNullable().references("id").inTable("orders").onDelete("CASCADE");
      // Sem foreign key para "products": a tabela é do módulo de catálogo. Nome e preço são copiados
      // no momento da compra, então o pedido não muda se o produto for alterado depois.
      table.integer("product_id").notNullable();
      table.string("product_name", 120).notNullable();
      table.integer("unit_price_cents").notNullable();
      table.integer("quantity").notNullable();
      table.primary(["order_id", "product_id"]);

      table.check("?? > 0", ["unit_price_cents"], "order_items_unit_price_positive");
      table.check("?? between 1 and 10", ["quantity"], "order_items_quantity_range");
    });
  },
  async down(db) {
    await db.schema.dropTable("order_items");
    await db.schema.dropTable("orders");
  },
};

export const ordersMigrations: Migration[] = [createOrders];
