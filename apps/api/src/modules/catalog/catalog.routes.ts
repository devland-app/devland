import type { FastifyInstance } from "fastify";

import { ProductNotFoundError, type CatalogService } from "./catalog.service.js";

// Maior valor da coluna "integer" do Postgres: um ID acima disso viraria erro 500 no banco.
const MAX_PRODUCT_ID = 2_147_483_647;

// O schema de resposta também controla a serialização: campo que não está aqui nunca sai na
// resposta, mesmo que a tabela ganhe colunas novas.
const productSchema = {
  type: "object",
  additionalProperties: false,
  required: ["id", "slug", "name", "concept", "description", "priceCents", "stock"],
  properties: {
    id: { type: "integer" },
    slug: { type: "string" },
    name: { type: "string" },
    concept: { type: "string" },
    description: { type: "string" },
    priceCents: { type: "integer" },
    stock: { type: "integer" },
  },
} as const;

const errorSchema = {
  type: "object",
  required: ["message"],
  properties: {
    message: { type: "string" },
  },
} as const;

interface ProductParams {
  id: number;
}

// Camada HTTP: valida a entrada, chama o service e traduz erros de negócio em status HTTP.
export function registerCatalogRoutes(app: FastifyInstance, service: CatalogService): void {
  app.get(
    "/products",
    { schema: { response: { 200: { type: "array", items: productSchema } } } },
    async () => service.listProducts(),
  );

  app.get<{ Params: ProductParams }>(
    "/products/:id",
    {
      schema: {
        params: {
          type: "object",
          required: ["id"],
          additionalProperties: false,
          properties: { id: { type: "integer", minimum: 1, maximum: MAX_PRODUCT_ID } },
        },
        response: { 200: productSchema, 404: errorSchema },
      },
    },
    async (request, reply) => {
      try {
        return await service.getProduct(request.params.id);
      } catch (error) {
        if (error instanceof ProductNotFoundError) {
          return reply.code(404).send({ message: "Produto não encontrado." });
        }
        throw error;
      }
    },
  );
}
