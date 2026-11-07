import type { FastifyInstance } from "fastify";

import { errorResponseSchema } from "../../shared/http.js";
import { ProductNotFoundError, type CatalogService } from "./catalog.service.js";

// Maior valor da coluna "integer" do Postgres: um ID acima disso viraria erro 500 no banco.
const MAX_PRODUCT_ID = 2_147_483_647;

// O schema de resposta também controla a serialização: campo que não está aqui nunca sai na
// resposta, mesmo que a tabela ganhe colunas novas. O $id faz dele um component "Product" no OpenAPI.
const productSchema = {
  $id: "Product",
  type: "object",
  description: "Miniatura colecionável da vitrine",
  additionalProperties: false,
  required: [
    "id",
    "slug",
    "name",
    "concept",
    "description",
    "priceCents",
    "stock",
    "imageUrl",
    "lesson",
  ],
  properties: {
    id: { type: "integer", examples: [1] },
    slug: { type: "string", examples: ["caranguejo-dos-conteineres"] },
    name: { type: "string", examples: ["Caranguejo dos Contêineres"] },
    concept: {
      type: "string",
      description: "Conceito de DevOps que inspirou o mascote",
      examples: ["Contêineres"],
    },
    description: { type: "string" },
    priceCents: {
      type: "integer",
      description: "Preço em centavos de real (de mentirinha: nada é cobrado)",
      examples: [4990],
    },
    stock: { type: "integer", description: "Unidades disponíveis", examples: [25] },
    imageUrl: {
      type: "string",
      format: "uri-reference",
      description: "Ilustração do mascote (SVG), relativa à URL da API",
      examples: ["/images/mascots/caranguejo-dos-conteineres.svg"],
    },
    lesson: {
      type: "object",
      description: "O conceito de DevOps que o mascote ensina",
      additionalProperties: false,
      required: ["explanation", "realWorld", "inDevZoo"],
      properties: {
        explanation: { type: "string", description: "O conceito em linguagem simples" },
        realWorld: { type: "string", description: "Um exemplo do dia a dia" },
        inDevZoo: { type: "string", description: "Onde a própria DevZoo aplica o conceito" },
      },
    },
  },
} as const;

interface ProductParams {
  id: number;
}

// Camada HTTP: valida a entrada, chama o service e traduz erros de negócio em status HTTP.
export function registerCatalogRoutes(app: FastifyInstance, service: CatalogService): void {
  app.addSchema(productSchema);

  app.get(
    "/products",
    {
      schema: {
        tags: ["catalog"],
        operationId: "listProducts",
        summary: "Lista as miniaturas da vitrine",
        response: {
          200: {
            description: "Todas as miniaturas, ordenadas por ID",
            type: "array",
            items: { $ref: "Product#" },
          },
        },
      },
    },
    async () => service.listProducts(),
  );

  app.get<{ Params: ProductParams }>(
    "/products/:id",
    {
      schema: {
        tags: ["catalog"],
        operationId: "getProduct",
        summary: "Detalha uma miniatura",
        params: {
          type: "object",
          required: ["id"],
          additionalProperties: false,
          properties: {
            id: {
              type: "integer",
              minimum: 1,
              maximum: MAX_PRODUCT_ID,
              description: "ID do produto",
            },
          },
        },
        response: {
          200: { description: "A miniatura encontrada", $ref: "Product#" },
          400: { description: "ID em formato inválido", ...errorResponseSchema },
          404: { description: "Nenhuma miniatura com esse ID", ...errorResponseSchema },
        },
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
