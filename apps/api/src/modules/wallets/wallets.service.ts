import { randomUUID } from "node:crypto";

import type { Transaction } from "../../shared/database.js";
import type { WalletRepository } from "./wallets.repository.js";
import type { Wallet, WalletMovement } from "./wallets.types.js";

export class WalletNotFoundError extends Error {
  constructor(id: string) {
    super(`Carteira ${id} não encontrada`);
    this.name = "WalletNotFoundError";
  }
}

export class InsufficientCoinsError extends Error {
  readonly missingCoins: number;

  constructor(balanceCoins: number, neededCoins: number) {
    super(`Saldo de ${balanceCoins} moedas, ${neededCoins} necessárias`);
    this.name = "InsufficientCoinsError";
    this.missingCoins = neededCoins - balanceCoins;
  }
}

// Regras das carteiras. As moedas são virtuais: entram por acertos nos quizzes e saem na adoção
// dos mascotes. Crédito e débito rodam dentro da transação de quem pediu o movimento.
export class WalletsService {
  private readonly wallets: WalletRepository;

  constructor(wallets: WalletRepository) {
    this.wallets = wallets;
  }

  createWallet(): Promise<Wallet> {
    return this.wallets.create(randomUUID());
  }

  async getWallet(id: string, trx?: Transaction): Promise<Wallet> {
    const wallet = await this.wallets.findById(id, trx);
    if (!wallet) {
      throw new WalletNotFoundError(id);
    }
    return wallet;
  }

  async credit(movement: WalletMovement, trx: Transaction): Promise<number> {
    const balance = await this.wallets.applyMovement(movement, movement.amountCoins, trx);
    if (balance === undefined) {
      throw new WalletNotFoundError(movement.walletId);
    }
    return balance;
  }

  async debit(movement: WalletMovement, trx: Transaction): Promise<number> {
    const balance = await this.wallets.applyMovement(movement, -movement.amountCoins, trx);
    if (balance === undefined) {
      const wallet = await this.getWallet(movement.walletId, trx);
      throw new InsufficientCoinsError(wallet.balanceCoins, movement.amountCoins);
    }
    return balance;
  }
}
