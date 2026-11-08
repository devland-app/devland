import { trace } from "@opentelemetry/api";
import type { FastifyInstance } from "fastify";

// A instrumentação de HTTP só conhece o método, e todo trace se chamaria "POST". O molde da rota dá
// o nome certo, sem o id de cada pedido. Com o tracing desligado, não há span ativo e nada acontece.
export function registerTraceNames(app: FastifyInstance): void {
  app.addHook("onRequest", async (request) => {
    trace
      .getActiveSpan()
      ?.updateName(`${request.method} ${request.routeOptions.url ?? "unmatched"}`);
  });
}
