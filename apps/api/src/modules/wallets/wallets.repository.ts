import type { Database, Transaction } from "../../shared/database.js";
import type { Wallet, WalletMovement } from "./wallets.types.js";

// Resultado de um movimento: aplicado (com o saldo novo), repetido (a referência já movimentou a
// carteira antes, então nada mudou) ou recusado (carteira inexistente ou saldo insuficiente).
export type MovementOutcome =
  { status: "applied"; balanceCoins: number } | { status: "duplicate" } | { status: "rejected" };

export interface WalletRepository {
  create(id: string): Promise<Wallet>;
  findById(id: string, trx?: Transaction): Promise<Wallet | undefined>;
  // Grava a linha do extrato e soma o valor ao saldo (negativo num débito), na transação de quem
  // chamou. Num movimento recusado, quem chamou precisa desfazer a transação.
  applyMovement(
    movement: WalletMovement,
    signedAmount: number,
    trx: Transaction,
  ): Promise<MovementOutcome>;
}

interface WalletRow {
  id: string;
  balance_coins: number;
  created_at: Date;
}

const WALLET_COLUMNS = ["id", "balance_coins", "created_at"] as const;

export class KnexWalletRepository implements WalletRepository {
  private readonly db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  async create(id: string): Promise<Wallet> {
    const [row] = await this.db<WalletRow>("wallets")
      .insert({ id })
      .returning([...WALLET_COLUMNS]);
    if (!row) {
      throw new Error(`Carteira ${id} não foi gravada`);
    }
    return toWallet(row);
  }

  async findById(id: string, trx?: Transaction): Promise<Wallet | undefined> {
    const row = await (trx ?? this.db)<WalletRow>("wallets")
      .select(...WALLET_COLUMNS)
      .where({ id })
      .first();
    return row ? toWallet(row) : undefined;
  }

  async applyMovement(
    movement: WalletMovement,
    signedAmount: number,
    trx: Transaction,
  ): Promise<MovementOutcome> {
    // O extrato vem primeiro: a referência é única por motivo, e "on conflict do nothing" faz a
    // segunda tentativa simplesmente não gravar nada, mesmo com duas requisições ao mesmo tempo.
    const inserted = await trx("wallet_entries")
      .insert({
        wallet_id: movement.walletId,
        amount_coins: signedAmount,
        reason: movement.reason,
        reference: movement.reference,
      })
      .onConflict(["reason", "reference"])
      .ignore()
      .returning("id");
    if (inserted.length === 0) {
      return { status: "duplicate" };
    }
    // Conferir e alterar o saldo é um único UPDATE condicional: duas compras ao mesmo tempo não
    // conseguem gastar as mesmas moedas, porque a segunda já encontra o saldo atualizado.
    const [row] = await trx<WalletRow>("wallets")
      .where({ id: movement.walletId })
      .andWhere("balance_coins", ">=", -signedAmount)
      .increment("balance_coins", signedAmount)
      .returning(["balance_coins"]);
    return row ? { status: "applied", balanceCoins: row.balance_coins } : { status: "rejected" };
  }
}

function toWallet(row: WalletRow): Wallet {
  return { id: row.id, balanceCoins: row.balance_coins, createdAt: row.created_at.toISOString() };
}
