import { randomUUID } from "node:crypto";

import type { InjectOptions } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { InMemoryQuestionBank } from "../../src/modules/quizzes/quizzes.bank.js";
import { startHarness, type Harness } from "./harness.js";

// Casos tristes e de borda da API: limites de cada campo, formatos inválidos, recursos que não
// existem e repetições. Os caminhos felizes estão em api.test.ts.

interface Product {
  id: number;
  slug: string;
  name: string;
  priceCoins: number;
}
interface Attempt {
  id: string;
  questions: Array<{ id: string; options: Array<{ id: string }> }>;
}

const bank = new InMemoryQuestionBank();
const right = (questionId: string) => bank.findQuestion(questionId)?.correctOptionId ?? "";

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
const product = (slug: string) => products.find((item) => item.slug === slug) as Product;

async function createWallet(): Promise<string> {
  return (await inject({ method: "POST", url: "/wallets" })).json<{ id: string }>().id;
}

async function startAttempt(slug: string, walletId: string): Promise<Attempt> {
  return (
    await inject({ method: "POST", url: `/quizzes/${slug}/attempts`, payload: { walletId } })
  ).json<Attempt>();
}

function answer(attemptId: string, payload: Record<string, unknown>) {
  return inject({ method: "POST", url: `/quiz-attempts/${attemptId}/answers`, payload });
}

function order(items: unknown, key: string | null = randomUUID()) {
  return inject({
    method: "POST",
    url: "/orders",
    headers: key === null ? {} : { "idempotency-key": key },
    payload: { items },
  });
}

async function earn(walletId: string, slug: string): Promise<void> {
  const attempt = await startAttempt(slug, walletId);
  for (const question of attempt.questions) {
    await answer(attempt.id, { questionId: question.id, optionId: right(question.id) });
  }
}

function expectMessage(response: { json: () => unknown }) {
  expect(response.json()).toEqual(expect.objectContaining({ message: expect.any(String) }));
}

describe("catálogo: entradas inválidas", () => {
  it.each(["abc", "0", "-1", "2147483648", "1.5"])("GET /products/%s responde 400", async (id) => {
    const response = await inject({ url: `/products/${id}` });
    expect(response.statusCode).toBe(400);
    expectMessage(response);
  });

  it("responde 404 para ilustração que não existe", async () => {
    expect((await inject({ url: "/images/mascots/unicornio.svg" })).statusCode).toBe(404);
  });

  it("não deixa sair da pasta das ilustrações", async () => {
    for (const url of [
      "/images/mascots/../../package.json",
      "/images/mascots/..%2f..%2fpackage.json",
      "/images/mascots/%2e%2e/%2e%2e/package.json",
    ]) {
      const response = await inject({ url });
      expect(response.statusCode).not.toBe(200);
      expect(response.body).not.toContain('"name"');
    }
  });

  it("serve as ilustrações com cache longo, já que o endereço muda quando o desenho muda", async () => {
    const response = await inject({ url: "/images/mascots/caranguejo-dos-conteineres.svg" });
    expect(response.headers["cache-control"]).toContain("max-age=86400");
  });
});

describe("carteiras: bordas", () => {
  it("cada criação gera um código novo", async () => {
    const [a, b] = await Promise.all([createWallet(), createWallet()]);
    expect(a).not.toBe(b);
  });
});

describe("quizzes: entradas inválidas", () => {
  it("recusa walletId inválido e parâmetros desconhecidos na lista", async () => {
    expect((await inject({ url: "/quizzes?walletId=abc" })).statusCode).toBe(400);
    expect((await inject({ url: "/quizzes?ordem=preco" })).statusCode).toBe(400);
  });

  it("carteira desconhecida na lista não quebra: só não tem progresso", async () => {
    const response = await inject({ url: `/quizzes?walletId=${randomUUID()}` });
    expect(response.statusCode).toBe(200);
    expect(response.json<Array<{ earnedCoins: number }>>().every((q) => q.earnedCoins === 0)).toBe(
      true,
    );
  });

  it.each([
    ["slug com maiúscula", "/quizzes/Caranguejo/attempts", { walletId: randomUUID() }],
    ["slug com caractere inválido", "/quizzes/cara_nguejo/attempts", { walletId: randomUUID() }],
    ["sem walletId", "/quizzes/castor-do-cache/attempts", {}],
    ["walletId inválido", "/quizzes/castor-do-cache/attempts", { walletId: "123" }],
    ["campo a mais", "/quizzes/castor-do-cache/attempts", { walletId: randomUUID(), bonus: 1 }],
  ])("POST de tentativa com %s responde 400", async (_case, url, payload) => {
    const response = await inject({ method: "POST", url, payload });
    expect(response.statusCode).toBe(400);
    expectMessage(response);
  });

  it("recusa respostas com formato inválido", async () => {
    const attempt = await startAttempt("castor-do-cache", await createWallet());
    const question = attempt.questions[0]?.id ?? "";
    for (const payload of [
      {},
      { questionId: question },
      { optionId: right(question) },
      { questionId: question, optionId: "XYZ" },
      { questionId: "Pergunta Com Espaço", optionId: right(question) },
      { questionId: question, optionId: "a".repeat(21) },
    ]) {
      expect((await answer(attempt.id, payload)).statusCode).toBe(400);
    }
    expect((await answer("nao-e-uuid", { questionId: question, optionId: "ab" })).statusCode).toBe(
      400,
    );
  });

  it("recusa pergunta de outro quiz e opção de outra pergunta", async () => {
    const attempt = await startAttempt("castor-do-cache", await createWallet());
    const [first, second] = attempt.questions;
    const otherQuiz = bank.find("raposa-dos-segredos")?.questions[0];
    if (!first || !second || !otherQuiz) throw new Error("dados de teste incompletos");

    const foreignQuestion = await answer(attempt.id, {
      questionId: otherQuiz.id,
      optionId: otherQuiz.correctOptionId,
    });
    expect(foreignQuestion.statusCode).toBe(422);
    const foreignOption = await answer(attempt.id, {
      questionId: first.id,
      optionId: right(second.id),
    });
    expect(foreignOption.statusCode).toBe(422);
  });

  it("conta as respostas até a última e não aceita nenhuma a mais", async () => {
    const attempt = await startAttempt("castor-do-cache", await createWallet());
    const counts: number[] = [];
    for (const question of attempt.questions) {
      const response = await answer(attempt.id, {
        questionId: question.id,
        optionId: right(question.id),
      });
      const body = response.json<{ answeredCount: number; questionCount: number }>();
      counts.push(body.answeredCount);
      expect(body.questionCount).toBe(5);
    }
    expect(counts).toEqual([1, 2, 3, 4, 5]);
    const last = attempt.questions[4]?.id ?? "";
    expect((await answer(attempt.id, { questionId: last, optionId: right(last) })).statusCode).toBe(
      409,
    );
  });

  it("dois cliques na mesma resposta ao mesmo tempo: uma vale, a outra é 409", async () => {
    const walletId = await createWallet();
    const attempt = await startAttempt("castor-do-cache", walletId);
    const question = attempt.questions[0]?.id ?? "";
    const results = await Promise.all(
      [1, 2].map(() => answer(attempt.id, { questionId: question, optionId: right(question) })),
    );
    expect(results.map((result) => result.statusCode).sort()).toEqual([200, 409]);
    const balance = (await inject({ url: `/wallets/${walletId}` })).json<{
      balanceCoins: number;
    }>();
    expect(balance.balanceCoins).toBe(18);
  });
});

describe("pedidos: entradas inválidas", () => {
  const one = () => [{ productId: product("lesminha-do-pipeline").id, quantity: 1 }];

  it.each([
    ["lista vazia", []],
    ["21 itens", Array.from({ length: 21 }, () => ({ productId: 1, quantity: 1 }))],
    ["productId zero", [{ productId: 0, quantity: 1 }]],
    ["productId decimal", [{ productId: 1.5, quantity: 1 }]],
    ["quantidade zero", [{ productId: 1, quantity: 0 }]],
    ["quantidade negativa", [{ productId: 1, quantity: -1 }]],
    ["sem quantidade", [{ productId: 1 }]],
    ["item que não é objeto", ["caranguejo"]],
  ])("recusa pedido com %s (400)", async (_case, items) => {
    const response = await order(items);
    expect(response.statusCode).toBe(400);
    expectMessage(response);
  });

  it.each([
    ["curta demais", "1234567"],
    ["com espaço", "chave com espaço"],
    ["com acento", "chave-çãoéí"],
    ["longa demais", "a".repeat(101)],
  ])("recusa Idempotency-Key %s (400)", async (_case, key) => {
    expect((await order(one(), key)).statusCode).toBe(400);
  });

  it("aceita Idempotency-Key nos limites: 8 e 100 caracteres", async () => {
    expect((await order(one(), `k${randomUUID().slice(0, 7)}`)).statusCode).toBe(201);
    expect((await order(one(), randomUUID().replace(/-/g, "").padEnd(100, "x"))).statusCode).toBe(
      201,
    );
  });

  it("a mesma chave com outro conteúdo devolve o pedido original, sem criar outro", async () => {
    const key = randomUUID();
    const first = await order(one(), key);
    const different = await order(
      [{ productId: product("polvo-orquestrador").id, quantity: 1 }],
      key,
    );
    expect(different.statusCode).toBe(200);
    expect(different.json<{ id: string }>().id).toBe(first.json<{ id: string }>().id);
    expect(different.json<{ items: Array<{ productName: string }> }>().items[0]?.productName).toBe(
      "Lesminha do Pipeline",
    );
  });

  it("soma o total de vários mascotes com os preços do catálogo", async () => {
    const slugs = ["caranguejo-dos-conteineres", "corujinha-das-branches", "raposa-dos-segredos"];
    const response = await order(
      slugs.map((slug) => ({ productId: product(slug).id, quantity: 1 })),
    );
    const expected = slugs.reduce((sum, slug) => sum + product(slug).priceCoins, 0);
    expect(response.json<{ totalCoins: number }>().totalCoins).toBe(expected);
  });
});

describe("pagamento: casos tristes", () => {
  async function pendingOrder(slug: string): Promise<string> {
    return (await order([{ productId: product(slug).id, quantity: 1 }])).json<{ id: string }>().id;
  }

  it.each([
    ["sem walletId", {}],
    ["walletId inválido", { walletId: "abc" }],
    ["campo a mais", { walletId: randomUUID(), amountCoins: 0 }],
  ])("recusa pagamento %s (400)", async (_case, payload) => {
    const orderId = await pendingOrder("abelha-dos-logs");
    const response = await inject({ method: "POST", url: `/orders/${orderId}/payment`, payload });
    expect(response.statusCode).toBe(400);
  });

  it("carteira que não existe é recusa com mensagem clara (402)", async () => {
    const orderId = await pendingOrder("abelha-dos-logs");
    const response = await inject({
      method: "POST",
      url: `/orders/${orderId}/payment`,
      payload: { walletId: randomUUID() },
    });
    expect(response.statusCode).toBe(402);
    expect(response.json<{ message: string }>().message).toContain("Carteira não encontrada");
  });

  it("mascote que esgotou enquanto a pessoa escolhia: 409 com o nome, sem debitar", async () => {
    const walletId = await createWallet();
    await earn(walletId, "corujinha-das-branches");
    const orderId = await pendingOrder("corujinha-das-branches");
    await harness.db("products").where({ slug: "corujinha-das-branches" }).update({ stock: 0 });
    try {
      const response = await inject({
        method: "POST",
        url: `/orders/${orderId}/payment`,
        payload: { walletId },
      });
      expect(response.statusCode).toBe(409);
      expect(response.json<{ message: string }>().message).toContain("Corujinha das Branches");
      const wallet = (await inject({ url: `/wallets/${walletId}` })).json<{
        balanceCoins: number;
      }>();
      expect(wallet.balanceCoins).toBe(80);
    } finally {
      await harness
        .db("products")
        .where({ slug: "corujinha-das-branches" })
        .update({ stock: 1000 });
    }
  });

  it("uma recusa não encerra o pedido: com saldo depois, o pagamento passa", async () => {
    const walletId = await createWallet();
    const orderId = await pendingOrder("abelha-dos-logs");
    const pay = () =>
      inject({ method: "POST", url: `/orders/${orderId}/payment`, payload: { walletId } });

    expect((await pay()).statusCode).toBe(402);
    await earn(walletId, "abelha-dos-logs");
    expect((await pay()).statusCode).toBe(200);

    const attempts = await harness
      .db("payments")
      .where({ order_id: orderId })
      .orderBy("created_at");
    expect(attempts.map((row: { status: string }) => row.status)).toEqual(["declined", "approved"]);
  });
});
