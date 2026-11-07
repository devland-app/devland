import type { FastifyInstance } from "fastify";

import { createTransactionRunner, type Database } from "../../shared/database.js";
import { InMemoryQuestionBank } from "./quizzes.bank.js";
import { KnexAttemptRepository } from "./quizzes.repository.js";
import { registerQuizRoutes } from "./quizzes.routes.js";
import { QuizzesService, type CoinCredit, type MascotPrices } from "./quizzes.service.js";

// API pública do módulo de quizzes: é a única porta de entrada para o resto da aplicação.
export { quizzesMigrations } from "./quizzes.migrations.js";
export { QUESTIONS_PER_ATTEMPT, splitReward } from "./quizzes.service.js";

export interface QuizzesModule {
  service: QuizzesService;
  registerRoutes(app: FastifyInstance): void;
}

// Carteira e catálogo chegam de fora (quizzes → wallets, quizzes → catalog), como interfaces.
export function createQuizzesModule(
  db: Database,
  wallets: CoinCredit,
  catalog: MascotPrices,
): QuizzesModule {
  const service = new QuizzesService(
    new InMemoryQuestionBank(),
    new KnexAttemptRepository(db),
    wallets,
    catalog,
    createTransactionRunner(db),
  );
  return {
    service,
    registerRoutes(app) {
      registerQuizRoutes(app, service);
    },
  };
}
