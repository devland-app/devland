import type { CartItemRequest, Order, PaymentMethod, PayOrderResponse, Product } from "./types.ts";

// Único lugar do front que chama fetch. A URL da API entra no build (VITE_API_URL) e vai para o
// JavaScript do navegador, então é pública: nunca coloque segredo numa variável VITE_.
const API_URL = (import.meta.env.VITE_API_URL ?? "http://localhost:3333").replace(/\/$/, "");

export class ApiError extends Error {
  // 0 quando a API nem respondeu (fora do ar, sem rede).
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

// As imagens dos mascotes são servidas pela API: o produto traz só o caminho.
export function apiAssetUrl(path: string): string {
  return `${API_URL}${path}`;
}

// A ilustração como texto, para a página do mascote animar as partes do desenho (olhos, boca).
export async function getMascotSvg(imageUrl: string): Promise<string> {
  let response: Response;
  try {
    response = await fetch(apiAssetUrl(imageUrl));
  } catch {
    throw new ApiError(0, "Não deu para carregar a ilustração agora.");
  }
  if (!response.ok) {
    throw new ApiError(response.status, "Não deu para carregar a ilustração agora.");
  }
  return response.text();
}

export function listProducts(): Promise<Product[]> {
  return request<Product[]>("/products");
}

// A Idempotency-Key é gerada uma vez por tentativa de compra: clicar de novo não cria outro pedido.
export function createOrder(items: CartItemRequest[], idempotencyKey: string): Promise<Order> {
  return request<Order>("/orders", {
    method: "POST",
    headers: { "Idempotency-Key": idempotencyKey },
    body: JSON.stringify({ items }),
  });
}

export function getOrder(id: string): Promise<Order> {
  return request<Order>(`/orders/${encodeURIComponent(id)}`);
}

export function payOrder(id: string, method: PaymentMethod): Promise<PayOrderResponse> {
  return request<PayOrderResponse>(`/orders/${encodeURIComponent(id)}/payment`, {
    method: "POST",
    body: JSON.stringify({ method }),
  });
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.body) {
    headers.set("Content-Type", "application/json");
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, { ...init, headers });
  } catch {
    throw new ApiError(
      0,
      "Não deu para falar com a loja agora. Confira a conexão e tente de novo.",
    );
  }

  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(
      response.status,
      messageFrom(body) ?? "Algo deu errado do lado da loja. Tente de novo em instantes.",
    );
  }
  // O formato é garantido pelo schema de resposta da API (o mesmo do contrato OpenAPI).
  return body as T;
}

// A API devolve erros como { "message": "..." }, já prontos para mostrar na tela.
function messageFrom(body: unknown): string | undefined {
  if (typeof body === "object" && body !== null && "message" in body) {
    return typeof body.message === "string" ? body.message : undefined;
  }
  return undefined;
}
