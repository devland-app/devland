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

export interface CreditResult {
  credited: boolean;
  balanceCoins: number;
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

  // Credita uma vez por referência. Se ela já rendeu moedas antes, nada muda e "credited" é false.
  async credit(movement: WalletMovement, trx: Transaction): Promise<CreditResult> {
    // Conferir antes: o extrato aponta para a carteira, e uma carteira inexistente viraria erro de
    // banco em vez de uma resposta clara.
    await this.getWallet(movement.walletId, trx);
    const outcome = await this.wallets.applyMovement(movement, movement.amountCoins, trx);
    if (outcome.status === "applied") {
      return { credited: true, balanceCoins: outcome.balanceCoins };
    }
    const wallet = await this.getWallet(movement.walletId, trx);
    return { credited: false, balanceCoins: wallet.balanceCoins };
  }

  // Num débito recusado por saldo, quem chamou precisa desfazer a transação (a linha do extrato
  // já foi gravada nela).
  async debit(movement: WalletMovement, trx: Transaction): Promise<number> {
    await this.getWallet(movement.walletId, trx);
    const outcome = await this.wallets.applyMovement(movement, -movement.amountCoins, trx);
    if (outcome.status === "applied") {
      return outcome.balanceCoins;
    }
    if (outcome.status === "duplicate") {
      throw new Error(`Débito repetido: ${movement.reason} ${movement.reference}`);
    }
    const wallet = await this.getWallet(movement.walletId, trx);
    throw new InsufficientCoinsError(wallet.balanceCoins, movement.amountCoins);
  }
}
