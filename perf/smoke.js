// Teste de fumaça de desempenho (k6): pouca carga, por pouco tempo, para saber se as rotas
// principais respondem e se a latência cabe no SLO (docs/desempenho.md). Não é teste de carga.
//
// Local (sobe banco e API se preciso):  docker compose --profile perf run --rm k6
// Produção, só leitura:                 docker compose --profile perf run --rm --no-deps \
//                                         -e BASE_URL=https://devland-app.vercel.app/api \
//                                         -e READ_ONLY=1 k6
import { check, sleep } from "k6";
import http from "k6/http";

const BASE_URL = (__ENV.BASE_URL || "http://localhost:3333").replace(/\/$/, "");
// Em produção o teste só lê: não deixa carteiras nem tentativas de quiz no banco de verdade.
const READ_ONLY = __ENV.READ_ONLY === "1";
const QUIZ = "castor-do-cache";

// Limite do SLO de latência: 95% das requisições abaixo dele.
const SLO_P95 = "p(95)<500";
const ROUTES = ["GET /health", "GET /products", "GET /quizzes"];
if (!READ_ONLY) ROUTES.push("POST /quizzes/:slug/attempts");

export const options = {
  vus: Number(__ENV.VUS || 2),
  duration: __ENV.DURATION || "30s",
  // O SLO vira critério de aprovação: se não cumprir, o k6 termina com erro. Um limite por rota
  // faz o resumo mostrar o p95 de cada uma, e não só o geral.
  thresholds: {
    http_req_duration: [SLO_P95],
    ...Object.fromEntries(ROUTES.map((route) => [`http_req_duration{name:${route}}`, [SLO_P95]])),
    http_req_failed: ["rate<0.01"],
    checks: ["rate>0.99"],
  },
  summaryTrendStats: ["avg", "med", "p(90)", "p(95)", "p(99)", "max"],
};

export function setup() {
  if (READ_ONLY) return {};
  const wallet = http.post(`${BASE_URL}/wallets`, null, { tags: { name: "POST /wallets" } });
  check(wallet, { "carteira criada": (response) => response.status === 201 });
  return { walletId: wallet.json("id") };
}

export default function (data) {
  const health = http.get(`${BASE_URL}/health`, { tags: { name: "GET /health" } });
  check(health, { "saúde 200": (response) => response.status === 200 });

  const products = http.get(`${BASE_URL}/products`, { tags: { name: "GET /products" } });
  check(products, {
    "vitrine 200 com mascotes": (response) => response.status === 200 && response.json().length > 0,
  });

  const quizzes = http.get(`${BASE_URL}/quizzes`, { tags: { name: "GET /quizzes" } });
  check(quizzes, {
    "quizzes 200": (response) => response.status === 200 && response.json().length > 0,
  });

  if (!READ_ONLY) {
    const attempt = http.post(
      `${BASE_URL}/quizzes/${QUIZ}/attempts`,
      JSON.stringify({ walletId: data.walletId }),
      {
        headers: { "Content-Type": "application/json" },
        tags: { name: "POST /quizzes/:slug/attempts" },
      },
    );
    check(attempt, {
      "tentativa com 5 perguntas": (response) =>
        response.status === 201 && response.json("questions").length === 5,
    });
  }

  // Uma pessoa não clica sem parar: o intervalo deixa a carga parecida com a de quem usa o site.
  sleep(1);
}
