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

// Os pedidos passam a ser pagos com moedas virtuais. Valores antigos, em centavos, viram moedas na
// razão de uma moeda por real, a mesma usada para preços de produtos fora do catálogo inicial.
const amountsInCoins: Migration = {
  name: "orders_002_amounts_in_coins",
  async up(db) {
    await db.schema.alterTable("orders", (table) => {
      table.renameColumn("total_cents", "total_coins");
    });
    await db.schema.alterTable("order_items", (table) => {
      table.renameColumn("unit_price_cents", "unit_price_coins");
    });
    await db("order_items").update({
      unit_price_coins: db.raw("greatest(1, round(unit_price_coins / 100.0))"),
    });
    await db("orders").update({
      total_coins: db.raw(
        "(select sum(unit_price_coins * quantity) from order_items where order_id = orders.id)",
      ),
    });
    await db.raw(
      "alter table orders rename constraint orders_total_cents_positive to orders_total_coins_positive",
    );
  },
  async down(db) {
    await db.raw(
      "alter table orders rename constraint orders_total_coins_positive to orders_total_cents_positive",
    );
    await db("order_items").update({ unit_price_coins: db.raw("unit_price_coins * 100") });
    await db("orders").update({ total_coins: db.raw("total_coins * 100") });
    await db.schema.alterTable("order_items", (table) => {
      table.renameColumn("unit_price_coins", "unit_price_cents");
    });
    await db.schema.alterTable("orders", (table) => {
      table.renameColumn("total_coins", "total_cents");
    });
  },
};

export const ordersMigrations: Migration[] = [createOrders, amountsInCoins];
