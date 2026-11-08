import { Ajv2020, type ValidateFunction } from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { afterEach, describe, expect, it, vi } from "vitest";
import { parse } from "yaml";

import contractText from "../../../../docs/openapi.yaml?raw";
import {
  answerQuizQuestion,
  ApiError,
  createOrder,
  createWallet,
  getOrder,
  getWallet,
  listProducts,
  listQuizzes,
  payOrder,
  startQuizAttempt,
} from "../shared/api/client.ts";
import { FakeBackend, fakeClient } from "./fakeApi.ts";

// Teste de contrato, lado do site. Prende ao docs/openapi.yaml as duas suposições que o site faz: o
// que o cliente envia (cada chamada existe no contrato, com parâmetros e corpo válidos) e o que ele
// espera receber (o dublê usado nas jornadas devolve o que a API promete). Se a API mudar e o
// contrato for regenerado, este teste reprova antes de o site quebrar em produção.
interface Parameter {
  name: string;
  in: "path" | "query" | "header";
  required?: boolean;
  schema: object;
}
interface Operation {
  parameters?: Parameter[];
  requestBody?: { content: Record<string, { schema: object }> };
  responses: Record<string, { content: Record<string, { schema: object }> }>;
}
interface Contract {
  paths: Record<string, Record<string, Operation>>;
  components: object;
}

const contract = parse(contractText) as Contract;
const ajv = new Ajv2020({ strict: false, allErrors: true });
addFormats(ajv);

function expectValid(schema: object, value: unknown, label: string) {
  // Os $ref do contrato apontam para #/components: eles vão junto, na raiz do schema.
  const validate: ValidateFunction = ajv.compile({ ...schema, components: contract.components });
  expect(validate(value), `${label}: ${ajv.errorsText(validate.errors)}`).toBe(true);
}

function matchTemplate(path: string): { template: string; values: Record<string, string> } {
  for (const template of Object.keys(contract.paths)) {
    const pattern = template.replace(/\{([^}]+)\}/g, "(?<$1>[^/]+)");
    const match = new RegExp(`^${pattern}$`).exec(path);
    if (match) return { template, values: { ...match.groups } };
  }
  throw new Error(`${path} não está no contrato`);
}

const WALLET_ID = "11111111-1111-4111-8111-111111111111";
const ORDER_ID = "22222222-2222-4222-8222-222222222222";
const ATTEMPT_ID = "33333333-3333-4333-8333-333333333333";

// Uma entrada por função do cliente que fala com a API.
const CLIENT_CALLS: Record<string, () => Promise<unknown>> = {
  listProducts: () => listProducts(),
  createWallet: () => createWallet(),
  getWallet: () => getWallet(WALLET_ID),
  listQuizzes: () => listQuizzes(WALLET_ID),
  startQuizAttempt: () => startQuizAttempt("castor-do-cache", WALLET_ID),
  answerQuizQuestion: () => answerQuizQuestion(ATTEMPT_ID, "cache-1", "abcdef0123"),
  createOrder: () =>
    createOrder([{ productId: 1, quantity: 1 }], "3f0c9a52-7d14-4a51-9a44-0d2f7b1c9e10"),
  getOrder: () => getOrder(ORDER_ID),
  payOrder: () => payOrder(ORDER_ID, WALLET_ID),
};

// A ilustração é um arquivo estático, não uma operação da API: fica fora do contrato.
const CLIENT_OPERATIONS = Object.keys(fakeClient).filter((name) => name !== "getMascotSvg");

describe("contrato, lado do site: o que o cliente envia", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("toda função do cliente que fala com a API está conferida", () => {
    expect(Object.keys(CLIENT_CALLS).sort()).toEqual([...CLIENT_OPERATIONS].sort());
  });

  it.each(Object.entries(CLIENT_CALLS))("%s faz uma chamada prevista", async (_name, run) => {
    const fetchSpy = vi.fn<typeof fetch>(
      async () =>
        new Response("{}", { status: 200, headers: { "content-type": "application/json" } }),
    );
    vi.stubGlobal("fetch", fetchSpy);
    await run();

    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    const { pathname, searchParams } = new URL(url);
    const { template, values } = matchTemplate(pathname);
    const method = (init.method ?? "GET").toLowerCase();
    const operation = contract.paths[template]?.[method];
    expect(operation, `${method} ${template} não está no contrato`).toBeDefined();

    const parameters = operation?.parameters ?? [];
    const headers = new Headers(init.headers);
    for (const parameter of parameters) {
      const sent =
        parameter.in === "path"
          ? values[parameter.name]
          : parameter.in === "query"
            ? (searchParams.get(parameter.name) ?? undefined)
            : (headers.get(parameter.name) ?? undefined);
      if (sent === undefined) {
        expect(parameter.required, `falta ${parameter.name}`).not.toBe(true);
        continue;
      }
      // Número em rota chega como texto; os ids usados aqui são textos no contrato.
      expectValid(parameter.schema, sent, `${method} ${template}, ${parameter.name}`);
    }
    for (const name of searchParams.keys()) {
      expect(
        parameters.some((parameter) => parameter.in === "query" && parameter.name === name),
        `parâmetro ${name} não está no contrato`,
      ).toBe(true);
    }

    const bodySchema = operation?.requestBody?.content["application/json"]?.schema;
    if (bodySchema) {
      expectValid(bodySchema, JSON.parse(String(init.body)), `corpo de ${method} ${template}`);
    } else {
      expect(init.body, `${method} ${template} não aceita corpo`).toBeUndefined();
    }
  });
});

describe("contrato, lado do site: o que o dublê da API devolve", () => {
  function expectResponse(method: string, template: string, status: number, body: unknown) {
    const media = contract.paths[template]?.[method]?.responses[status]?.content;
    expect(media, `${method} ${template} ${status} não está no contrato`).toBeDefined();
    expectValid(media?.["application/json"]?.schema ?? {}, body, `${method} ${template} ${status}`);
  }

  it("segue o contrato em toda a jornada", async () => {
    const backend = new FakeBackend(ApiError);
    const checked = new Set<string>();
    const check = (
      name: string,
      method: string,
      template: string,
      status: number,
      body: unknown,
    ) => {
      checked.add(name);
      expectResponse(method, template, status, body);
    };

    const products = await backend.listProducts();
    check("listProducts", "get", "/products", 200, products);
    const wallet = await backend.createWallet();
    check("createWallet", "post", "/wallets", 201, wallet);
    check("getWallet", "get", "/wallets/{id}", 200, await backend.getWallet(wallet.id));
    check("listQuizzes", "get", "/quizzes", 200, await backend.listQuizzes(wallet.id));

    const slug = products[0]?.slug ?? "";
    const attempt = await backend.startQuizAttempt(slug, wallet.id);
    check("startQuizAttempt", "post", "/quizzes/{slug}/attempts", 201, attempt);
    const question = attempt.questions[0];
    const answer = await backend.answerQuizQuestion(
      attempt.id,
      question?.id ?? "",
      question?.options[0]?.id ?? "",
    );
    check("answerQuizQuestion", "post", "/quiz-attempts/{id}/answers", 200, answer);

    backend.wallets.set(wallet.id, 1000);
    const order = await backend.createOrder(
      [{ productId: products[0]?.id ?? 0, quantity: 1 }],
      "3f0c9a52-7d14-4a51-9a44-0d2f7b1c9e10",
    );
    check("createOrder", "post", "/orders", 201, order);
    check("getOrder", "get", "/orders/{id}", 200, await backend.getOrder(order.id));
    const payment = await backend.payOrder(order.id, wallet.id);
    check("payOrder", "post", "/orders/{id}/payment", 200, payment);

    expect([...checked].sort()).toEqual([...CLIENT_OPERATIONS].sort());
  });
});
