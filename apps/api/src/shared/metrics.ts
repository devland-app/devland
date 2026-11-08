import type { FastifyInstance } from "fastify";
import { Histogram, Registry, collectDefaultMetrics } from "prom-client";

// Faixas do histograma, em segundos. Uma delas é exatamente o limite do SLO (0,5 s, em
// docs/desempenho.md): assim a fração de requisições dentro do objetivo sai direto da métrica.
export const SLO_LATENCY_SECONDS = 0.5;
const DURATION_BUCKETS = [0.01, 0.025, 0.05, 0.1, 0.25, SLO_LATENCY_SECONDS, 1, 2.5, 5];

// Rótulo das requisições que não casaram com nenhuma rota (404 de URL desconhecida).
const UNMATCHED_ROUTE = "unmatched";

const metricsSchema = {
  tags: ["health"],
  operationId: "getMetrics",
  summary: "Métricas da API no formato do Prometheus",
  description:
    "Duração das requisições por método, rota e status (taxa, erros e latência saem da mesma " +
    "métrica), mais as métricas do processo Node. Na Vercel, cada instância da função tem os " +
    "próprios contadores.",
  response: {
    200: {
      description: "Métricas no formato de texto do Prometheus",
      content: { "text/plain": { schema: { type: "string" } } },
    },
  },
} as const;

export function registerMetrics(app: FastifyInstance): void {
  // Um registro por app, e não o global do prom-client: os testes montam vários apps no mesmo
  // processo, e o registro global recusaria a mesma métrica duas vezes.
  const registry = new Registry();
  collectDefaultMetrics({ register: registry });

  const duration = new Histogram({
    name: "http_request_duration_seconds",
    help: "Duração das requisições HTTP, por método, rota e status",
    labelNames: ["method", "route", "status_code"] as const,
    buckets: DURATION_BUCKETS,
    registers: [registry],
  });

  app.addHook("onResponse", async (request, reply) => {
    // O rótulo é o molde da rota (/orders/:id), nunca a URL: com o id, cada pedido criaria uma
    // série nova, e a memória da métrica cresceria sem limite.
    const route = request.routeOptions.url ?? UNMATCHED_ROUTE;
    // A coleta da própria métrica não entra na conta: senão a frequência de coleta distorce a taxa.
    if (route === "/metrics") return;
    duration.observe(
      { method: request.method, route, status_code: String(reply.statusCode) },
      reply.elapsedTime / 1000,
    );
  });

  app.get("/metrics", { schema: metricsSchema }, async (_request, reply) => {
    // Cada coleta precisa do valor do momento: a CDN não pode guardar a resposta.
    reply.header("Cache-Control", "no-store").type(registry.contentType);
    return registry.metrics();
  });
}
