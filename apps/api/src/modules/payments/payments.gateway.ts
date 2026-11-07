import { randomUUID } from "node:crypto";

import type { Transaction } from "../../shared/database.js";
import {
  InsufficientCoinsError,
  WalletNotFoundError,
  type WalletMovement,
} from "../wallets/index.js";
import type { ChargeRequest, ChargeResult } from "./payments.types.js";

// Padrão Strategy: o módulo depende só desta interface. O pagamento com moedas é uma
// implementação; outra forma de pagamento seria outra classe com a mesma interface.
export interface PaymentGateway {
  charge(request: ChargeRequest, trx: Transaction): Promise<ChargeResult>;
}

// O que este gateway usa do módulo de carteiras (payments → wallets, nunca o contrário).
export interface CoinDebit {
  debit(movement: WalletMovement, trx: Transaction): Promise<number>;
}

// Pagar é debitar as moedas da carteira, dentro da transação do pedido: se algo falhar depois
// (estoque, gravação), o débito é desfeito junto.
export class CoinsPaymentGateway implements PaymentGateway {
  private readonly wallets: CoinDebit;

  constructor(wallets: CoinDebit) {
    this.wallets = wallets;
  }

  async charge(request: ChargeRequest, trx: Transaction): Promise<ChargeResult> {
    try {
      await this.wallets.debit(
        {
          walletId: request.walletId,
          amountCoins: request.amountCoins,
          reason: "order_payment",
          reference: request.orderId,
        },
        trx,
      );
    } catch (error) {
      if (error instanceof InsufficientCoinsError) {
        const missing = error.missingCoins;
        return {
          status: "declined",
          reason: `Saldo insuficiente: ${missing === 1 ? "falta 1 moeda" : `faltam ${missing} moedas`}. Responda um quiz para ganhar mais.`,
        };
      }
      if (error instanceof WalletNotFoundError) {
        return {
          status: "declined",
          reason: "Carteira não encontrada. Recarregue a página e tente de novo.",
        };
      }
      throw error;
    }
    return { status: "approved", receiptCode: `DL-${randomUUID().slice(0, 8).toUpperCase()}` };
  }
}
