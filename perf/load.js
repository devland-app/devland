// Teste de carga (k6) em 3 estágios: subida, patamar e descida. Pede o banco com 100 mil pedidos
// (perf/seed-orders.sql). O relatório, com o gargalo antes e depois, está em docs/desempenho.md.
//
//   docker compose --profile perf run --rm seed
//   docker compose --profile perf run --rm k6 run /perf/load.js
//
// Cada usuário virtual navega como quem adota um mascote: vitrine, quizzes, um pedido antigo, um
// pedido novo, o pagamento e o pedido pago. Grava no banco: nunca aponte para a produção.
import { check, sleep } from "k6";
import crypto from "k6/crypto";
import http from "k6/http";

const BASE_URL = (__ENV.BASE_URL || "http://localhost:3333").replace(/\/$/, "");
const VUS = Number(__ENV.VUS || 800);
const SEEDED_ORDERS = 100000;
const SEEDED_WALLETS = 200;
const PRODUCT_COUNT = 9;

// Limite do SLO de latência: 95% das requisições abaixo dele.
const SLO_P95 = "p(95)<500";
const ROUTES = [
  "GET /products",
  "GET /quizzes",
  "GET /orders/:id",
  "POST /orders",
  "POST /orders/:id/payment",
];

export const options = {
  stages: [
    { duration: __ENV.RAMP || "15s", target: VUS },
    { duration: __ENV.HOLD || "40s", target: VUS },
    { duration: __ENV.RAMP || "15s", target: 0 },
  ],
  thresholds: {
    http_req_duration: [SLO_P95],
    ...Object.fromEntries(ROUTES.map((route) => [`http_req_duration{name:${route}}`, [SLO_P95]])),
    http_req_failed: ["rate<0.01"],
  },
  summaryTrendStats: ["avg", "med", "p(90)", "p(95)", "p(99)", "max"],
};

// Mesma conta do perf/seed-orders.sql: md5 do texto, escrito como UUID.
function seededId(text) {
  const hex = crypto.md5(text, "hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

const pick = (limit) => Math.floor(Math.random() * limit) + 1;
const JSON_HEADERS = { "Content-Type": "application/json" };

export default function () {
  const walletId = seededId(`carga-carteira-${(__VU % SEEDED_WALLETS) + 1}`);

  const products = http.get(`${BASE_URL}/products`, { tags: { name: "GET /products" } });
  check(products, { "vitrine 200": (response) => response.status === 200 });

  const quizzes = http.get(`${BASE_URL}/quizzes?walletId=${walletId}`, {
    tags: { name: "GET /quizzes" },
  });
  check(quizzes, { "quizzes 200": (response) => response.status === 200 });

  const oldOrder = http.get(
    `${BASE_URL}/orders/${seededId(`carga-pedido-${pick(SEEDED_ORDERS)}`)}`,
    {
      tags: { name: "GET /orders/:id" },
    },
  );
  check(oldOrder, { "pedido antigo 200": (response) => response.status === 200 });

  const created = http.post(
    `${BASE_URL}/orders`,
    JSON.stringify({ items: [{ productId: pick(PRODUCT_COUNT), quantity: 1 }] }),
    {
      headers: { ...JSON_HEADERS, "Idempotency-Key": `carga-${__VU}-${__ITER}-${Date.now()}` },
      tags: { name: "POST /orders" },
    },
  );
  check(created, { "pedido criado 201": (response) => response.status === 201 });

  if (created.status === 201) {
    const orderId = created.json("id");
    const paid = http.post(`${BASE_URL}/orders/${orderId}/payment`, JSON.stringify({ walletId }), {
      headers: JSON_HEADERS,
      tags: { name: "POST /orders/:id/payment" },
    });
    check(paid, { "pagamento 200": (response) => response.status === 200 });
  }

  sleep(1);
}
