import type { Migration } from "../../shared/database.js";

// O módulo de quizzes é dono de "quiz_attempts" e "quiz_answers". As perguntas ficam no código.
const createQuizAttempts: Migration = {
  name: "quizzes_001_create_attempts",
  async up(db) {
    await db.schema.createTable("quiz_attempts", (table) => {
      table.uuid("id").primary();
      table.string("quiz_slug", 60).notNullable();
      // Referência à carteira sem foreign key: "wallets" é tabela de outro módulo.
      table.uuid("wallet_id").notNullable().index();
      // Perguntas sorteadas para esta tentativa, na ordem em que foram mostradas.
      table.jsonb("question_ids").notNullable();
      table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(db.fn.now());
    });

    await db.schema.createTable("quiz_answers", (table) => {
      table
        .uuid("attempt_id")
        .notNullable()
        .references("id")
        .inTable("quiz_attempts")
        .onDelete("CASCADE");
      table.string("question_id", 60).notNullable();
      table.string("option_id", 20).notNullable();
      table.boolean("correct").notNullable();
      table.integer("coins_awarded").notNullable();
      table.timestamp("answered_at", { useTz: true }).notNullable().defaultTo(db.fn.now());

      // Uma resposta por pergunta em cada tentativa: responder de novo não rende moedas de novo.
      table.primary(["attempt_id", "question_id"]);
      table.check("?? >= 0", ["coins_awarded"], "quiz_answers_coins_not_negative");
    });
  },
  async down(db) {
    await db.schema.dropTable("quiz_answers");
    await db.schema.dropTable("quiz_attempts");
  },
};

export const quizzesMigrations: Migration[] = [createQuizAttempts];
