import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";

import { Ajv2020, type ValidateFunction } from "ajv/dist/2020.js";
import formats from "ajv-formats";
import type { InjectOptions, LightMyRequestResponse } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { parse } from "yaml";

import { buildApp } from "../../src/app.js";
import { InMemoryQuestionBank } from "../../src/modules/quizzes/quizzes.bank.js";
import { createDatabase } from "../../src/shared/database.js";
import { FRONT_ORIGIN, startHarness, type Harness } from "./harness.js";

// Teste de contrato, lado da API: cada resposta real é comparada com o docs/openapi.yaml versionado,
// que é o que o site e qualquer outro cliente enxergam. O último teste exige que todo par de rota e
// status declarado tenha sido exercitado: status novo no contrato sem teste aqui reprova.
interface Operation {
  responses: Record<string, { content: Record<string, { schema: object }> }>;
}
interface Contract {
  paths: Record<string, Record<string, Operation>>;
  components: object;
}

const contract = parse(
  readFileSync(new URL("../../../../docs/openapi.yaml", import.meta.url), "utf8"),
) as Contract;

// O ajv-formats é CommonJS: em ESM, o plugin chega como default da exportação padrão.
const addFormats = formats as unknown as typeof formats.default;
const ajv = new Ajv2020({ strict: false, allErrors: true });
addFormats(ajv);

const validators = new Map<string, ValidateFunction>();
const exercised = new Set<string>();

function templateOf(url: string): string {
  const path = url.split("?")[0] ?? url;
  const template = Object.keys(contract.paths).find((candidate) =>
    new RegExp(`^${candidate.replace(/\{[^}]+\}/g, "[^/]+")}$`).test(path),
  );
  expect(template, `${path} não está no contrato`).toBeDefined();
  return template as string;
}

function expectToMatchContract(method: string, url: string, response: LightMyRequestResponse) {
  const template = templateOf(url);
  const pair = `${method} ${template} ${response.statusCode}`;
  const operation = contract.paths[template]?.[method.toLowerCase()];
  const declared = operation?.responses[String(response.statusCode)];
  expect(declared, `${pair} não está no contrato: ${response.body}`).toBeDefined();
  exercised.add(pair);

  const [mediaType, media] = Object.entries(declared?.content ?? {})[0] ?? [];
  expect(response.headers["content-type"]).toContain(mediaType);
  let validate = validators.get(pair);
  if (!validate) {
    // Os $ref do contrato apontam para #/components: eles vão junto, na raiz do schema.
    validate = ajv.compile({ ...media?.schema, components: contract.components });
    validators.set(pair, validate);
  }
  const body: unknown = mediaType === "application/json" ? response.json() : response.body;
  expect(validate(body), `${pair}: ${ajv.errorsText(validate.errors)}`).toBe(true);
}

const bank = new InMemoryQuestionBank();
const right = (questionId: string) => bank.findQuestion(questionId)?.correctOptionId ?? "";
const UNKNOWN_ID = "00000000-0000-4000-8000-000000000000";

interface Product {
  id: number;
  slug: string;
}
interface Attempt {
  id: string;
  questions: Array<{ id: string }>;
}

let harness: Harness;
let products: Product[];

async function call(options: InjectOptions & { url: string; method?: "GET" | "POST" }) {
  const response = await harness.app.inject(options);
  expectToMatchContract(options.method ?? "GET", options.url, response);
  return response;
}

const postJson = (url: string, payload: object, headers: Record<string, string> = {}) =>
  call({ method: "POST", url, payload, headers });

async function newWallet(): Promise<string> {
  return (await call({ method: "POST", url: "/wallets" })).json<{ id: string }>().id;
}

const startAttempt = async (slug: string, walletId: string) =>
  (await postJson(`/quizzes/${slug}/attempts`, { walletId })).json<Attempt>();

const answer = (attemptId: string, questionId: string, optionId: string) =>
  postJson(`/quiz-attempts/${attemptId}/answers`, { questionId, optionId });

async function earnPriceOf(slug: string, walletId: string) {
  const attempt = await startAttempt(slug, walletId);
  for (const question of attempt.questions) {
    await answer(attempt.id, question.id, right(question.id));
  }
}

const newOrder = (productId: number, key: string = randomUUID()) =>
  postJson("/orders", { items: [{ productId, quantity: 1 }] }, { "idempotency-key": key });

function productBySlug(slug: string): Product {
  return products.find((item) => item.slug === slug) as Product;
}

async function withoutStock<T>(slug: string, run: () => Promise<T>): Promise<T> {
  await harness.db("products").where({ slug }).update({ stock: 0 });
  try {
    return await run();
  } finally {
    await harness.db("products").where({ slug }).update({ stock: 1000 });
  }
}

beforeAll(async () => {
  harness = await startHarness();
  products = (await call({ url: "/products" })).json<Product[]>();
});

afterAll(async () => {
  await harness?.close();
});

describe("contrato da API (docs/openapi.yaml)", () => {
  it("saúde e métricas", async () => {
    await call({ url: "/health" });
    await call({ url: "/metrics" });

    const offline = createDatabase("postgres://devland:devland@127.0.0.1:1/devland");
    const app = await buildApp({ logger: false, db: offline, corsOrigins: [FRONT_ORIGIN] });
    try {
      expectToMatchContract("GET", "/health", await app.inject({ url: "/health" }));
    } finally {
      await app.close();
      await offline.destroy();
    }
  });

  it("catálogo", async () => {
    await call({ url: `/products/${productBySlug("castor-do-cache").id}` });
    await call({ url: "/products/abc" });
    await call({ url: "/products/999999" });
  });

  it("carteiras", async () => {
    await call({ url: `/wallets/${await newWallet()}` });
    await call({ url: "/wallets/nao-e-uuid" });
    await call({ url: `/wallets/${UNKNOWN_ID}` });
  });

  it("lista de quizzes", async () => {
    await call({ url: "/quizzes" });
    await call({ url: `/quizzes?walletId=${await newWallet()}` });
    await call({ url: "/quizzes?walletId=nao-e-uuid" });
  });

  it("tentativas e respostas", async () => {
    const walletId = await newWallet();
    const attempt = await startAttempt("polvo-orquestrador", walletId);
    const [first, second] = attempt.questions as [{ id: string }, { id: string }];

    await postJson("/quizzes/polvo-orquestrador/attempts", {});
    await postJson("/quizzes/unicornio/attempts", { walletId });
    await postJson("/quizzes/polvo-orquestrador/attempts", { walletId: UNKNOWN_ID });

    await answer(attempt.id, first.id, right(first.id));
    await answer(attempt.id, first.id, right(first.id));
    await postJson(`/quiz-attempts/${attempt.id}/answers`, {});
    await answer(UNKNOWN_ID, first.id, right(first.id));
    await answer(attempt.id, second.id, "abcdef0123");
  });

  it("pedidos", async () => {
    const owl = productBySlug("corujinha-das-branches");
    const key = randomUUID();
    const created = (await newOrder(owl.id, key)).json<{ id: string }>();
    await newOrder(owl.id, key);

    await call({
      method: "POST",
      url: "/orders",
      payload: { items: [{ productId: owl.id, quantity: 1 }] },
    });
    await newOrder(999999);
    await withoutStock(owl.slug, () => newOrder(owl.id));

    await call({ url: `/orders/${created.id}` });
    await call({ url: "/orders/nao-e-uuid" });
    await call({ url: `/orders/${UNKNOWN_ID}` });
  });

  it("pagamento", async () => {
    const bee = productBySlug("abelha-dos-logs");
    const walletId = await newWallet();
    const order = (await newOrder(bee.id)).json<{ id: string }>();
    const pay = () => postJson(`/orders/${order.id}/payment`, { walletId });

    await pay();
    await postJson(`/orders/${order.id}/payment`, {});
    await postJson(`/orders/${UNKNOWN_ID}/payment`, { walletId });

    await earnPriceOf(bee.slug, walletId);
    await withoutStock(bee.slug, pay);
    await pay();
  });

  it("todo par de rota e status do contrato foi exercitado", () => {
    const declared = Object.entries(contract.paths).flatMap(([path, operations]) =>
      Object.entries(operations).flatMap(([method, operation]) =>
        Object.keys(operation.responses).map(
          (status) => `${method.toUpperCase()} ${path} ${status}`,
        ),
      ),
    );
    expect(declared.filter((pair) => !exercised.has(pair))).toEqual([]);
  });
});
