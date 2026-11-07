import type { FastifyInstance } from "fastify";

import type { Database } from "../../shared/database.js";
import { KnexWalletRepository } from "./wallets.repository.js";
import { registerWalletRoutes } from "./wallets.routes.js";
import { WalletsService } from "./wallets.service.js";

// API pública do módulo de carteiras: é a única porta de entrada para o resto da aplicação.
// Não depende de nenhum outro módulo; quizzes (crédito) e pagamentos (débito) dependem dele.
export { walletsMigrations } from "./wallets.migrations.js";
export { InsufficientCoinsError, WalletNotFoundError } from "./wallets.service.js";
export type { CreditResult, WalletsService } from "./wallets.service.js";
export type { Wallet, WalletEntryReason, WalletMovement } from "./wallets.types.js";

export interface WalletsModule {
  service: WalletsService;
  registerRoutes(app: FastifyInstance): void;
}

export function createWalletsModule(db: Database): WalletsModule {
  const service = new WalletsService(new KnexWalletRepository(db));
  return {
    service,
    registerRoutes(app) {
      registerWalletRoutes(app, service);
    },
  };
}
