import { randomUUID } from "node:crypto";

import type { InjectOptions } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { buildApp } from "../../src/app.js";
import { InMemoryQuestionBank } from "../../src/modules/quizzes/quizzes.bank.js";
import { createDatabase } from "../../src/shared/database.js";
import { FRONT_ORIGIN, startHarness, type Harness } from "./harness.js";

interface Product {
  id: number;
  slug: string;
  priceCoins: number;
  stock: number;
  imageUrl: string;
}
interface Attempt {
  id: string;
  questions: Array<{ id: string; options: Array<{ id: string }>; coins: number }>;
}
interface QuizSummary {
  slug: string;
  totalCoins: number;
  earnedCoins: number;
}

// O gabarito vem do mesmo banco de perguntas que a API usa: o teste sabe a resposta certa sem
// que ela apareça na resposta da API.
const bank = new InMemoryQuestionBank();
const right = (questionId: string) => bank.findQuestion(questionId)?.correctOptionId ?? "";
const wrong = (questionId: string) =>
  bank.findQuestion(questionId)?.options.find((option) => option.id !== right(questionId))?.id ??
  "";

let harness: Harness;
let products: Product[];

beforeAll(async () => {
  harness = await startHarness();
  products = (await harness.app.inject({ url: "/products" })).json<Product[]>();
});

afterAll(async () => {
  await harness?.close();
});

const inject = (options: InjectOptions) => harness.app.inject(options);
const product = (slug: string) => products.find((candidate) => candidate.slug === slug) as Product;

async function createWallet(): Promise<string> {
  return (await inject({ method: "POST", url: "/wallets" })).json<{ id: string }>().id;
}

async function balanceOf(walletId: string): Promise<number> {
  return (await inject({ url: `/wallets/${walletId}` })).json<{ balanceCoins: number }>()
    .balanceCoins;
}

async function startAttempt(slug: string, walletId: string): Promise<Attempt> {
  const response = await inject({
    method: "POST",
    url: `/quizzes/${slug}/attempts`,
    payload: { walletId },
  });
  expect(response.statusCode).toBe(201);
  return response.json<Attempt>();
}

function answer(attemptId: string, questionId: string, optionId: string) {
  return inject({
    method: "POST",
    url: `/quiz-attempts/${attemptId}/answers`,
    payload: { questionId, optionId },
  });
}

async function playQuiz(slug: string, walletId: string): Promise<void> {
  const attempt = await startAttempt(slug, walletId);
  for (const question of attempt.questions) {
    await answer(attempt.id, question.id, right(question.id));
  }
}

function createOrder(slugs: string[], key: string = randomUUID()) {
  return inject({
    method: "POST",
    url: "/orders",
    headers: { "idempotency-key": key },
    payload: { items: slugs.map((slug) => ({ productId: product(slug).id, quantity: 1 })) },
  });
}

function pay(orderId: string, walletId: string) {
  return inject({ method: "POST", url: `/orders/${orderId}/payment`, payload: { walletId } });
}

describe("saúde e catálogo", () => {
  it("responde a saúde com o banco no ar", async () => {
    const response = await inject({ url: "/health" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: "ok", database: "ok" });
  });

  it("lista os 8 mascotes com preço em moedas e imagem versionada", () => {
    expect(products).toHaveLength(8);
    for (const item of products) {
      expect(item.priceCoins).toBeGreaterThan(0);
      expect(item.imageUrl).toMatch(/^\/images\/mascots\/[a-z-]+\.svg\?v=[0-9a-f]{8}$/);
    }
  });

  it("serve a ilustração com proteção contra scripts", async () => {
    const response = await inject({ url: product("caranguejo-dos-conteineres").imageUrl });
    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("image/svg+xml");
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(response.headers["content-security-policy"]).toBeDefined();
  });

  it("devolve 404 para mascote inexistente", async () => {
    expect((await inject({ url: "/products/9999" })).statusCode).toBe(404);
  });
});

describe("carteiras", () => {
  it("cria vazia e consulta pelo código", async () => {
    const created = await inject({ method: "POST", url: "/wallets" });
    expect(created.statusCode).toBe(201);
    const wallet = created.json<{ id: string; balanceCoins: number }>();
    expect(wallet.balanceCoins).toBe(0);
    expect((await inject({ url: `/wallets/${wallet.id}` })).statusCode).toBe(200);
  });

  it("responde 404 para código desconhecido e 400 para formato inválido", async () => {
    expect((await inject({ url: `/wallets/${randomUUID()}` })).statusCode).toBe(404);
    expect((await inject({ url: "/wallets/abc" })).statusCode).toBe(400);
  });
});

describe("quizzes e moedas", () => {
  it("cada quiz paga o preço do seu mascote", async () => {
    const quizzes = (await inject({ url: "/quizzes" })).json<QuizSummary[]>();
    expect(quizzes).toHaveLength(8);
    for (const quiz of quizzes) {
      expect(quiz.totalCoins).toBe(product(quiz.slug).priceCoins);
    }
  });

  it("entrega as perguntas sem o gabarito", async () => {
    const walletId = await createWallet();
    const response = await inject({
      method: "POST",
      url: "/quizzes/castor-do-cache/attempts",
      payload: { walletId },
    });
    expect(response.statusCode).toBe(201);
    expect(response.body).not.toContain("correctOptionId");
    expect(response.body).not.toContain("explanation");
  });

  it("recusa respostas inválidas com o status certo", async () => {
    const walletId = await createWallet();
    const attempt = await startAttempt("castor-do-cache", walletId);
    const [first, second] = attempt.questions;
    if (!first || !second) throw new Error("tentativa sem perguntas");

    expect((await answer(attempt.id, first.id, wrong(first.id))).statusCode).toBe(200);
    expect((await answer(attempt.id, first.id, right(first.id))).statusCode).toBe(409);
    expect((await answer(attempt.id, second.id, "abcdef0123")).statusCode).toBe(422);
    expect((await answer(randomUUID(), second.id, right(second.id))).statusCode).toBe(404);
    const extraField = await inject({
      method: "POST",
      url: `/quiz-attempts/${attempt.id}/answers`,
      payload: { questionId: second.id, optionId: right(second.id), coins: 999 },
    });
    expect(extraField.statusCode).toBe(400);
  });

  it("recusa quiz inexistente e carteira inexistente", async () => {
    const walletId = await createWallet();
    const unknownQuiz = await inject({
      method: "POST",
      url: "/quizzes/unicornio/attempts",
      payload: { walletId },
    });
    expect(unknownQuiz.statusCode).toBe(404);
    const unknownWallet = await inject({
      method: "POST",
      url: "/quizzes/castor-do-cache/attempts",
      payload: { walletId: randomUUID() },
    });
    expect(unknownWallet.statusCode).toBe(422);
  });

  it("paga uma vez só quando a mesma pergunta é acertada em duas tentativas ao mesmo tempo", async () => {
    const walletId = await createWallet();
    const [first, second] = await Promise.all([
      startAttempt("raposa-dos-segredos", walletId),
      startAttempt("raposa-dos-segredos", walletId),
    ]);
    const target = first.questions[0]?.id ?? "";
    const results = await Promise.all(
      [first, second].map((attempt) => answer(attempt.id, target, right(target))),
    );
    const coins = results.map((result) => result.json<{ coinsAwarded: number }>().coinsAwarded);
    expect(coins.sort((a, b) => a - b)).toEqual([0, first.questions[0]?.coins]);
    expect(await balanceOf(walletId)).toBe(first.questions[0]?.coins);
  });

  it("fecha a conta: acertar tudo paga todos os mascotes, e o saldo termina em zero", async () => {
    const walletId = await createWallet();
    for (const item of products) {
      await playQuiz(item.slug, walletId);
    }
    const total = products.reduce((sum, item) => sum + item.priceCoins, 0);
    expect(await balanceOf(walletId)).toBe(total);

    const quizzes = (await inject({ url: `/quizzes?walletId=${walletId}` })).json<QuizSummary[]>();
    expect(quizzes.every((quiz) => quiz.earnedCoins === quiz.totalCoins)).toBe(true);

    const order = await createOrder(products.map((item) => item.slug));
    expect(order.json<{ totalCoins: number }>().totalCoins).toBe(total);
    expect((await pay(order.json<{ id: string }>().id, walletId)).statusCode).toBe(200);
    expect(await balanceOf(walletId)).toBe(0);
  });
});

describe("pedidos", () => {
  it("a mesma Idempotency-Key devolve o mesmo pedido, até com dois cliques juntos", async () => {
    const key = randomUUID();
    const [first, second] = await Promise.all([
      createOrder(["lesminha-do-pipeline"], key),
      createOrder(["lesminha-do-pipeline"], key),
    ]);
    expect([first.statusCode, second.statusCode].sort()).toEqual([200, 201]);
    expect(first.json<{ id: string }>().id).toBe(second.json<{ id: string }>().id);
    const replay = [first, second].find((response) => response.statusCode === 200);
    expect(replay?.headers["idempotent-replayed"]).toBe("true");
  });

  it("recusa pedido sem chave, com preço vindo do cliente ou com mascote repetido", async () => {
    const productId = product("lesminha-do-pipeline").id;
    const withoutKey = await inject({
      method: "POST",
      url: "/orders",
      payload: { items: [{ productId, quantity: 1 }] },
    });
    const withPrice = await inject({
      method: "POST",
      url: "/orders",
      headers: { "idempotency-key": randomUUID() },
      payload: { items: [{ productId, quantity: 1, priceCoins: 1 }] },
    });
    const twoUnits = await inject({
      method: "POST",
      url: "/orders",
      headers: { "idempotency-key": randomUUID() },
      payload: { items: [{ productId, quantity: 2 }] },
    });
    const unknown = await inject({
      method: "POST",
      url: "/orders",
      headers: { "idempotency-key": randomUUID() },
      payload: { items: [{ productId: 9999, quantity: 1 }] },
    });
    expect([withoutKey, withPrice, twoUnits].map((response) => response.statusCode)).toEqual([
      400, 400, 400,
    ]);
    expect(unknown.statusCode).toBe(422);
  });

  it("recusa o pagamento sem saldo e diz quanto falta", async () => {
    const walletId = await createWallet();
    const order = await createOrder(["polvo-orquestrador"]);
    const response = await pay(order.json<{ id: string }>().id, walletId);
    expect(response.statusCode).toBe(402);
    expect(response.json<{ message: string }>().message).toContain("faltam 150 moedas");
  });

  it("dois pagamentos disputando as mesmas moedas: só um passa", async () => {
    const walletId = await createWallet();
    await playQuiz("corujinha-das-branches", walletId);
    const bought = ["corujinha-das-branches", "abelha-dos-logs"];
    expect(
      product(bought[0] ?? "").priceCoins + product(bought[1] ?? "").priceCoins,
    ).toBeGreaterThan(await balanceOf(walletId));
    const orders = await Promise.all(bought.map((slug) => createOrder([slug])));
    const results = await Promise.all(
      orders.map((order) => pay(order.json<{ id: string }>().id, walletId)),
    );
    expect(results.map((result) => result.statusCode).sort()).toEqual([200, 402]);
    expect(await balanceOf(walletId)).toBe(0);
  });

  it("pagar de novo devolve o mesmo recibo, e o estoque baixa uma vez só", async () => {
    const walletId = await createWallet();
    await playQuiz("tartaruga-do-rollback", walletId);
    const slug = "tartaruga-do-rollback";
    const stockBefore = (await inject({ url: `/products/${product(slug).id}` })).json<Product>()
      .stock;
    const orderId = (await createOrder([slug])).json<{ id: string }>().id;

    const first = await pay(orderId, walletId);
    const again = await pay(orderId, walletId);
    type Paid = { payment: { receiptCode: string }; order: { status: string } };
    expect(first.json<Paid>().order.status).toBe("paid");
    expect(again.json<Paid>().payment.receiptCode).toBe(first.json<Paid>().payment.receiptCode);
    expect(again.headers["idempotent-replayed"]).toBe("true");

    const stockAfter = (await inject({ url: `/products/${product(slug).id}` })).json<Product>()
      .stock;
    expect(stockAfter).toBe(stockBefore - 1);
  });

  it("consulta o pedido pelo código", async () => {
    const created = (await createOrder(["castor-do-cache"])).json<{ id: string }>();
    const response = await inject({ url: `/orders/${created.id}` });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ id: created.id, status: "awaiting_payment" });
    expect((await inject({ url: `/orders/${randomUUID()}` })).statusCode).toBe(404);
  });

  it("responde 404 para pedido desconhecido e 400 para código inválido", async () => {
    const walletId = await createWallet();
    expect((await pay(randomUUID(), walletId)).statusCode).toBe(404);
    expect((await inject({ url: "/orders/123" })).statusCode).toBe(400);
  });
});

describe("CORS", () => {
  it("libera só a origem do site", async () => {
    const preflight = (origin: string) =>
      inject({
        method: "OPTIONS",
        url: "/orders",
        headers: { origin, "access-control-request-method": "POST" },
      });
    expect((await preflight(FRONT_ORIGIN)).headers["access-control-allow-origin"]).toBe(
      FRONT_ORIGIN,
    );
    expect(
      (await preflight("https://site-estranho.example")).headers["access-control-allow-origin"],
    ).toBeUndefined();
  });
});

describe("banco fora do ar", () => {
  // Porta fechada: toda consulta falha. A API não pode vazar o erro do banco para o cliente.
  it("a saúde vira 503 e os erros internos saem com mensagem genérica", async () => {
    const offline = createDatabase("postgres://devland:devland@127.0.0.1:1/devland");
    const app = await buildApp({ logger: false, db: offline, corsOrigins: [FRONT_ORIGIN] });
    try {
      const health = await app.inject({ url: "/health" });
      expect(health.statusCode).toBe(503);
      const products = await app.inject({ url: "/products" });
      expect(products.statusCode).toBe(500);
      expect(products.json()).toEqual({ message: "Erro interno. Tente novamente em instantes." });
      expect(products.headers["cache-control"]).toBeUndefined();
    } finally {
      await app.close();
      await offline.destroy();
    }
  });
});
