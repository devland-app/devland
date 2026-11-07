import { beforeEach, describe, expect, it } from "vitest";

import { CoinsPaymentGateway } from "../../src/modules/payments/payments.gateway.js";
import {
  InsufficientCoinsError,
  WalletNotFoundError,
  WalletsService,
} from "../../src/modules/wallets/wallets.service.js";
import type { WalletMovement } from "../../src/modules/wallets/wallets.types.js";
import { fakeTransaction, InMemoryWalletRepository } from "./fakes.js";

const MISSING = "00000000-0000-4000-8000-000000000000";

function movement(walletId: string, amountCoins: number, reference: string): WalletMovement {
  return { walletId, amountCoins, reason: "quiz_answer", reference };
}

describe("WalletsService", () => {
  let service: WalletsService;
  let walletId: string;

  beforeEach(async () => {
    service = new WalletsService(new InMemoryWalletRepository());
    walletId = (await service.createWallet()).id;
  });

  it("cria carteiras vazias com código UUID", async () => {
    const wallet = await service.getWallet(walletId);
    expect(wallet.balanceCoins).toBe(0);
    expect(wallet.id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("avisa quando a carteira não existe", async () => {
    await expect(service.getWallet(MISSING)).rejects.toBeInstanceOf(WalletNotFoundError);
    await expect(
      service.credit(movement(MISSING, 10, "x"), fakeTransaction),
    ).rejects.toBeInstanceOf(WalletNotFoundError);
  });

  it("credita uma vez por referência", async () => {
    const first = await service.credit(movement(walletId, 20, "q1"), fakeTransaction);
    const again = await service.credit(movement(walletId, 20, "q1"), fakeTransaction);
    expect(first).toEqual({ credited: true, balanceCoins: 20 });
    expect(again).toEqual({ credited: false, balanceCoins: 20 });
  });

  it("debita quando há saldo e diz quanto falta quando não há", async () => {
    await service.credit(movement(walletId, 50, "q1"), fakeTransaction);
    const debit = { ...movement(walletId, 30, "pedido-1"), reason: "order_payment" as const };
    expect(await service.debit(debit, fakeTransaction)).toBe(20);

    const tooMuch = { ...debit, amountCoins: 45, reference: "pedido-2" };
    const error = await service.debit(tooMuch, fakeTransaction).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(InsufficientCoinsError);
    expect((error as InsufficientCoinsError).missingCoins).toBe(25);
    expect((await service.getWallet(walletId)).balanceCoins).toBe(20);
  });

  it("não debita duas vezes o mesmo pedido", async () => {
    await service.credit(movement(walletId, 50, "q1"), fakeTransaction);
    const debit = { ...movement(walletId, 10, "pedido-1"), reason: "order_payment" as const };
    await service.debit(debit, fakeTransaction);
    await expect(service.debit(debit, fakeTransaction)).rejects.toThrow("Débito repetido");
  });
});

describe("CoinsPaymentGateway", () => {
  let wallets: WalletsService;
  let gateway: CoinsPaymentGateway;
  let walletId: string;

  beforeEach(async () => {
    wallets = new WalletsService(new InMemoryWalletRepository());
    gateway = new CoinsPaymentGateway(wallets);
    walletId = (await wallets.createWallet()).id;
    await wallets.credit(movement(walletId, 100, "q1"), fakeTransaction);
  });

  it("aprova debitando as moedas e devolve um recibo", async () => {
    const result = await gateway.charge(
      { orderId: "pedido-1", walletId, amountCoins: 80 },
      fakeTransaction,
    );
    expect(result).toMatchObject({ status: "approved" });
    expect(result.status === "approved" && result.receiptCode).toMatch(/^DL-[0-9A-F]{8}$/);
    expect((await wallets.getWallet(walletId)).balanceCoins).toBe(20);
  });

  it.each([
    [130, "faltam 30 moedas"],
    [101, "falta 1 moeda"],
  ])("recusa %i moedas com a mensagem de quanto falta", async (amountCoins, text) => {
    const result = await gateway.charge(
      { orderId: "pedido-1", walletId, amountCoins },
      fakeTransaction,
    );
    expect(result.status).toBe("declined");
    expect(result.status === "declined" && result.reason).toContain(text);
  });

  it("recusa carteira inexistente com uma mensagem clara", async () => {
    const result = await gateway.charge(
      { orderId: "pedido-1", walletId: MISSING, amountCoins: 10 },
      fakeTransaction,
    );
    expect(result.status === "declined" && result.reason).toContain("Carteira não encontrada");
  });

  it("deixa passar erros inesperados", async () => {
    const broken = new CoinsPaymentGateway({
      debit: () => Promise.reject(new Error("banco fora do ar")),
    });
    await expect(
      broken.charge({ orderId: "pedido-1", walletId, amountCoins: 10 }, fakeTransaction),
    ).rejects.toThrow("banco fora do ar");
  });
});
