import type { Migration } from "../../shared/database.js";

// O módulo de catálogo é dono da tabela "products": nenhum outro módulo lê ou escreve nela direto.
// Os nomes levam o prefixo do módulo para não colidir com as migrations de orders e payments.
const createProducts: Migration = {
  name: "catalog_001_create_products",
  async up(db) {
    await db.schema.createTable("products", (table) => {
      table.increments("id").primary();
      table.string("slug", 80).notNullable().unique();
      table.string("name", 120).notNullable();
      // Conceito de DevOps que inspirou o mascote (ex.: "Contêineres", "CI/CD").
      table.string("concept", 60).notNullable();
      table.text("description").notNullable();
      // Dinheiro sempre em centavos: inteiros não têm erro de arredondamento.
      table.integer("price_cents").notNullable();
      table.integer("stock").notNullable().defaultTo(0);
      table.timestamps(true, true);

      // As regras ficam também no banco: nem um bug na API grava preço zero ou estoque negativo.
      table.check("?? > 0", ["price_cents"], "products_price_cents_positive");
      table.check("?? >= 0", ["stock"], "products_stock_not_negative");
    });
  },
  async down(db) {
    await db.schema.dropTable("products");
  },
};

export const catalogMigrations: Migration[] = [createProducts];
