import { catalogMigrations } from "./modules/catalog/index.js";
import { ordersMigrations } from "./modules/orders/index.js";
import { paymentsMigrations } from "./modules/payments/index.js";
import { quizzesMigrations } from "./modules/quizzes/index.js";
import { walletsMigrations } from "./modules/wallets/index.js";
import type { Migration } from "./shared/database.js";

// Ponto de composição: cada módulo exporta as suas migrations e elas são somadas aqui, em ordem.
// O servidor e os testes de integração usam a mesma lista.
export const migrations: Migration[] = [
  ...catalogMigrations,
  ...ordersMigrations,
  ...paymentsMigrations,
  ...walletsMigrations,
  ...quizzesMigrations,
];
