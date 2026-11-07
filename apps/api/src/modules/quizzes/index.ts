import type { FastifyInstance } from "fastify";

import { createTransactionRunner, type Database } from "../../shared/database.js";
import { InMemoryQuestionBank } from "./quizzes.bank.js";
import { KnexAttemptRepository } from "./quizzes.repository.js";
import { registerQuizRoutes } from "./quizzes.routes.js";
import { QuizzesService, type CoinCredit } from "./quizzes.service.js";

// API pública do módulo de quizzes: é a única porta de entrada para o resto da aplicação.
export { quizzesMigrations } from "./quizzes.migrations.js";
export { COINS_PER_CORRECT_ANSWER, QUESTIONS_PER_ATTEMPT } from "./quizzes.service.js";

export interface QuizzesModule {
  service: QuizzesService;
  registerRoutes(app: FastifyInstance): void;
}

// A carteira chega de fora (quizzes → wallets, nunca o contrário), como interface.
export function createQuizzesModule(db: Database, wallets: CoinCredit): QuizzesModule {
  const service = new QuizzesService(
    new InMemoryQuestionBank(),
    new KnexAttemptRepository(db),
    wallets,
    createTransactionRunner(db),
  );
  return {
    service,
    registerRoutes(app) {
      registerQuizRoutes(app, service);
    },
  };
}
