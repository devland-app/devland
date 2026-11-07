import type { Database, Transaction } from "../../shared/database.js";
import type { Wallet, WalletMovement } from "./wallets.types.js";

// A mesma referência já movimentou a carteira (ex.: a mesma resposta de quiz chegou duas vezes).
export class DuplicateMovementError extends Error {
  constructor(movement: WalletMovement) {
    super(`Movimento repetido: ${movement.reason} ${movement.reference}`);
    this.name = "DuplicateMovementError";
  }
}

export interface WalletRepository {
  create(id: string): Promise<Wallet>;
  findById(id: string, trx?: Transaction): Promise<Wallet | undefined>;
  // Soma o valor ao saldo (negativo num débito) e grava a linha do extrato, na transação de quem
  // chamou. Devolve o novo saldo, ou undefined se a carteira não existe ou ficaria negativa.
  applyMovement(
    movement: WalletMovement,
    signedAmount: number,
    trx: Transaction,
  ): Promise<number | undefined>;
}

interface WalletRow {
  id: string;
  balance_coins: number;
  created_at: Date;
}

const WALLET_COLUMNS = ["id", "balance_coins", "created_at"] as const;
const UNIQUE_VIOLATION = "23505";

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
  ): Promise<number | undefined> {
    // Conferir e alterar o saldo é um único UPDATE condicional: duas compras ao mesmo tempo não
    // conseguem gastar as mesmas moedas, porque a segunda já encontra o saldo atualizado.
    const [row] = await trx<WalletRow>("wallets")
      .where({ id: movement.walletId })
      .andWhere("balance_coins", ">=", -signedAmount)
      .increment("balance_coins", signedAmount)
      .returning(["balance_coins"]);
    if (!row) {
      return undefined;
    }
    try {
      await trx("wallet_entries").insert({
        wallet_id: movement.walletId,
        amount_coins: signedAmount,
        reason: movement.reason,
        reference: movement.reference,
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new DuplicateMovementError(movement);
      }
      throw error;
    }
    return row.balance_coins;
  }
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === UNIQUE_VIOLATION &&
    "constraint" in error &&
    error.constraint === "wallet_entries_one_per_reference"
  );
}

function toWallet(row: WalletRow): Wallet {
  return { id: row.id, balanceCoins: row.balance_coins, createdAt: row.created_at.toISOString() };
}
