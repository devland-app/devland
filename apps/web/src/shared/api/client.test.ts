import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  ApiError,
  answerQuizQuestion,
  apiAssetUrl,
  createOrder,
  createWallet,
  getMascotSvg,
  getOrder,
  getWallet,
  listProducts,
  listQuizzes,
  payOrder,
  startQuizAttempt,
} from "./client.ts";

const fetchMock = vi.fn<typeof fetch>();

function respond(status: number, body: unknown, asJson = true): Response {
  return new Response(asJson ? JSON.stringify(body) : String(body), {
    status,
    headers: asJson ? { "Content-Type": "application/json" } : {},
  });
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
});

describe("client da API", () => {
  it("devolve o corpo JSON das respostas de sucesso", async () => {
    fetchMock.mockResolvedValue(respond(200, [{ id: 1 }]));
    await expect(listProducts()).resolves.toEqual([{ id: 1 }]);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("http://localhost:3333/products");
  });

  it("transforma falha de rede em ApiError com status 0 e mensagem amigável", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    const error = await listProducts().catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 0 });
    expect((error as Error).message).toContain("Não deu para falar com a loja");
  });

  it("usa a mensagem da API nos erros 4xx", async () => {
    fetchMock.mockResolvedValue(respond(402, { message: "Saldo insuficiente: faltam 20 moedas." }));
    await expect(payOrder("pedido-1", "carteira-1")).rejects.toMatchObject({
      status: 402,
      message: "Saldo insuficiente: faltam 20 moedas.",
    });
  });

  it.each([
    ["corpo que não é JSON", respond(502, "Bad Gateway", false)],
    ["JSON sem mensagem", respond(500, { erro: true })],
    ["mensagem que não é texto", respond(500, { message: 42 })],
  ])("usa uma mensagem genérica quando o erro vem com %s", async (_case, response) => {
    fetchMock.mockResolvedValue(response);
    await expect(listProducts()).rejects.toMatchObject({
      message: "Algo deu errado do lado da loja. Tente de novo em instantes.",
    });
  });

  it("manda a Idempotency-Key e só produto e quantidade ao criar pedido", async () => {
    fetchMock.mockResolvedValue(respond(201, { id: "pedido-1" }));
    await createOrder([{ productId: 1, quantity: 1 }], "chave-123456");
    const [, init] = fetchMock.mock.calls[0] ?? [];
    const headers = new Headers(init?.headers);
    expect(init?.method).toBe("POST");
    expect(headers.get("Idempotency-Key")).toBe("chave-123456");
    expect(headers.get("Content-Type")).toBe("application/json");
    expect(JSON.parse(String(init?.body))).toEqual({ items: [{ productId: 1, quantity: 1 }] });
  });

  it("monta a busca de quizzes com e sem carteira", async () => {
    fetchMock.mockImplementation(async () => respond(200, []));
    await listQuizzes();
    await listQuizzes("abc def");
    expect(fetchMock.mock.calls.map((call) => call[0])).toEqual([
      "http://localhost:3333/quizzes",
      "http://localhost:3333/quizzes?walletId=abc%20def",
    ]);
  });

  it("baixa a ilustração como texto e avisa quando ela não carrega", async () => {
    fetchMock.mockResolvedValueOnce(new Response("<svg/>", { status: 200 }));
    await expect(getMascotSvg("/images/mascots/x.svg")).resolves.toBe("<svg/>");
    fetchMock.mockResolvedValueOnce(new Response("", { status: 404 }));
    await expect(getMascotSvg("/images/mascots/x.svg")).rejects.toMatchObject({ status: 404 });
    fetchMock.mockRejectedValueOnce(new TypeError("offline"));
    await expect(getMascotSvg("/images/mascots/x.svg")).rejects.toMatchObject({ status: 0 });
  });

  it("monta o endereço das ilustrações a partir da API", () => {
    expect(apiAssetUrl("/images/mascots/x.svg")).toBe("http://localhost:3333/images/mascots/x.svg");
  });

  it("monta as chamadas de carteira, quiz e pedido com método, endereço e corpo certos", async () => {
    fetchMock.mockImplementation(async () => respond(200, {}));
    await createWallet();
    await getWallet("carteira 1");
    await startQuizAttempt("castor-do-cache", "carteira-1");
    await answerQuizQuestion("tentativa-1", "q1", "o1");
    await getOrder("pedido/1");
    const calls = fetchMock.mock.calls.map(([url, init]) => [
      init?.method ?? "GET",
      url,
      init?.body ? JSON.parse(String(init.body)) : null,
    ]);
    expect(calls).toEqual([
      ["POST", "http://localhost:3333/wallets", null],
      ["GET", "http://localhost:3333/wallets/carteira%201", null],
      [
        "POST",
        "http://localhost:3333/quizzes/castor-do-cache/attempts",
        { walletId: "carteira-1" },
      ],
      [
        "POST",
        "http://localhost:3333/quiz-attempts/tentativa-1/answers",
        { questionId: "q1", optionId: "o1" },
      ],
      ["GET", "http://localhost:3333/orders/pedido%2F1", null],
    ]);
  });
});
