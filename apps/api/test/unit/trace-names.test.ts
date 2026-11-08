import { trace, type Span } from "@opentelemetry/api";
import Fastify from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";

import { registerTraceNames } from "../../src/shared/trace-names.js";

function appWithRoute() {
  const app = Fastify();
  registerTraceNames(app);
  app.get("/orders/:id", async () => ({ ok: true }));
  return app;
}

describe("nome dos traces", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("usa o molde da rota, sem o id de cada pedido", async () => {
    const updateName = vi.fn();
    vi.spyOn(trace, "getActiveSpan").mockReturnValue({ updateName } as unknown as Span);
    const app = appWithRoute();
    await app.inject({ url: "/orders/123" });
    await app.inject({ url: "/nao-existe" });
    expect(updateName.mock.calls).toEqual([["GET /orders/:id"], ["GET unmatched"]]);
  });

  it("com o tracing desligado, a requisição segue normal", async () => {
    const response = await appWithRoute().inject({ url: "/orders/123" });
    expect(response.statusCode).toBe(200);
  });
});
