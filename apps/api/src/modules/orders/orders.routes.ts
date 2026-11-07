import type { FastifyInstance } from "fastify";

import { errorResponseSchema } from "../../shared/http.js";
import { paymentSchema } from "../payments/index.js";
import {
  InsufficientStockError,
  MAX_UNITS_PER_PRODUCT,
  OrderNotFoundError,
  PaymentDeclinedError,
  QuantityLimitError,
  SoldOutError,
  UnknownProductsError,
  type OrdersService,
} from "./orders.service.js";
import type { OrderItemRequest } from "./orders.types.js";

// Maior valor da coluna "integer" do Postgres (IDs de produto).
const MAX_PRODUCT_ID = 2_147_483_647;

const orderItemSchema = {
  $id: "OrderItem",
  type: "object",
  additionalProperties: false,
  required: ["productId", "productName", "unitPriceCoins", "quantity", "subtotalCoins"],
  properties: {
    productId: { type: "integer", examples: [1] },
    productName: { type: "string", examples: ["Caranguejo dos Contêineres"] },
    unitPriceCoins: {
      type: "integer",
      description: "Preço unitário no momento da adoção, em moedas",
      examples: [120],
    },
    quantity: { type: "integer", examples: [1] },
    subtotalCoins: { type: "integer", examples: [120] },
  },
} as const;

const orderSchema = {
  $id: "Order",
  type: "object",
  description: "Pedido de adoção, pago com moedas virtuais",
  additionalProperties: false,
  required: ["id", "status", "items", "totalCoins", "createdAt", "paidAt"],
  properties: {
    id: {
      type: "string",
      format: "uuid",
      description: "Código do pedido. Sem login, é ele que dá acesso ao pedido.",
    },
    status: { type: "string", enum: ["awaiting_payment", "paid"] },
    items: { type: "array", items: { $ref: "OrderItem#" } },
    totalCoins: { type: "integer", description: "Total em moedas", examples: [200] },
    createdAt: { type: "string", format: "date-time" },
    paidAt: { type: ["string", "null"], format: "date-time" },
  },
} as const;

interface CreateOrderRequest {
  Headers: { "idempotency-key": string };
  Body: { items: OrderItemRequest[] };
}

interface OrderParams {
  Params: { id: string };
}

interface PayOrderRequest {
  Params: { id: string };
  Body: { walletId: string };
}

const VIRTUAL_COINS = "Pago com moedas virtuais: nenhum dinheiro foi usado.";

const orderIdParamsSchema = {
  type: "object",
  required: ["id"],
  additionalProperties: false,
  properties: { id: { type: "string", format: "uuid", description: "Código do pedido" } },
} as const;

// Camada HTTP: valida a entrada, chama o service e traduz erros de negócio em status HTTP.
export function registerOrderRoutes(app: FastifyInstance, service: OrdersService): void {
  app.addSchema(orderItemSchema);
  app.addSchema(orderSchema);
  app.addSchema(paymentSchema);

  app.post<CreateOrderRequest>(
    "/orders",
    {
      schema: {
        tags: ["orders"],
        operationId: "createOrder",
        summary: "Cria um pedido de adoção a partir do carrinho",
        description:
          "Só produto e quantidade vêm do cliente: preços e nomes saem do catálogo. " +
          "Repetir a mesma Idempotency-Key devolve o pedido já criado (200), sem criar outro.",
        headers: {
          type: "object",
          required: ["idempotency-key"],
          properties: {
            "idempotency-key": {
              type: "string",
              minLength: 8,
              maxLength: 100,
              pattern: "^[A-Za-z0-9_-]+$",
              description: "Chave única por tentativa de compra (ex.: um UUID gerado no navegador)",
            },
          },
        },
        body: {
          type: "object",
          additionalProperties: false,
          required: ["items"],
          properties: {
            items: {
              type: "array",
              minItems: 1,
              maxItems: 20,
              items: {
                type: "object",
                additionalProperties: false,
                required: ["productId", "quantity"],
                properties: {
                  productId: { type: "integer", minimum: 1, maximum: MAX_PRODUCT_ID },
                  quantity: { type: "integer", minimum: 1, maximum: MAX_UNITS_PER_PRODUCT },
                },
              },
            },
          },
        },
        response: {
          201: { description: "Pedido criado", $ref: "Order#" },
          200: { description: "Pedido já existente para esta Idempotency-Key", $ref: "Order#" },
          400: { description: "Requisição inválida", ...errorResponseSchema },
          409: { description: "Estoque insuficiente", ...errorResponseSchema },
          422: { description: "Produto inexistente ou acima do limite", ...errorResponseSchema },
        },
      },
    },
    async (request, reply) => {
      try {
        const { order, created } = await service.createOrder({
          idempotencyKey: request.headers["idempotency-key"],
          items: request.body.items,
        });
        if (!created) {
          // Mesmo cabeçalho usado por APIs de pagamento para sinalizar uma resposta repetida.
          reply.header("Idempotent-Replayed", "true");
        }
        return reply.code(created ? 201 : 200).send(order);
      } catch (error) {
        if (error instanceof UnknownProductsError) {
          return reply
            .code(422)
            .send({ message: "Algum produto do carrinho não existe mais. Atualize a vitrine." });
        }
        if (error instanceof QuantityLimitError) {
          return reply.code(422).send({ message: error.message });
        }
        if (error instanceof InsufficientStockError) {
          return reply.code(409).send({ message: error.message });
        }
        throw error;
      }
    },
  );

  app.get<OrderParams>(
    "/orders/:id",
    {
      schema: {
        tags: ["orders"],
        operationId: "getOrder",
        summary: "Consulta um pedido pelo código",
        params: orderIdParamsSchema,
        response: {
          200: { description: "O pedido", $ref: "Order#" },
          400: { description: "Código em formato inválido", ...errorResponseSchema },
          404: { description: "Nenhum pedido com esse código", ...errorResponseSchema },
        },
      },
    },
    async (request, reply) => {
      try {
        return await service.getOrder(request.params.id);
      } catch (error) {
        if (error instanceof OrderNotFoundError) {
          return reply.code(404).send({ message: "Pedido não encontrado." });
        }
        throw error;
      }
    },
  );

  app.post<PayOrderRequest>(
    "/orders/:id/payment",
    {
      schema: {
        tags: ["orders"],
        operationId: "payOrder",
        summary: "Paga um pedido com as moedas de uma carteira",
        description:
          "As moedas são virtuais e não valem dinheiro. Baixa de estoque, débito das moedas e pedido " +
          "pago acontecem juntos ou não acontecem. Pagar um pedido já pago devolve o mesmo recibo, " +
          "sem debitar de novo.",
        params: orderIdParamsSchema,
        body: {
          type: "object",
          additionalProperties: false,
          required: ["walletId"],
          properties: {
            walletId: { type: "string", format: "uuid", description: "Carteira que paga o pedido" },
          },
        },
        response: {
          200: {
            description: "Pedido pago (ou já estava pago)",
            type: "object",
            additionalProperties: false,
            required: ["notice", "order", "payment"],
            properties: {
              notice: { type: "string", examples: [VIRTUAL_COINS] },
              order: { $ref: "Order#" },
              payment: { $ref: "Payment#" },
            },
          },
          400: { description: "Requisição inválida", ...errorResponseSchema },
          402: { description: "Pagamento recusado (saldo insuficiente)", ...errorResponseSchema },
          404: { description: "Nenhum pedido com esse código", ...errorResponseSchema },
          409: { description: "Um mascote do pedido esgotou", ...errorResponseSchema },
        },
      },
    },
    async (request, reply) => {
      try {
        const { order, payment, alreadyPaid } = await service.payOrder(
          request.params.id,
          request.body.walletId,
        );
        if (alreadyPaid) {
          reply.header("Idempotent-Replayed", "true");
        }
        return { notice: VIRTUAL_COINS, order, payment };
      } catch (error) {
        if (error instanceof OrderNotFoundError) {
          return reply.code(404).send({ message: "Pedido não encontrado." });
        }
        if (error instanceof PaymentDeclinedError) {
          return reply.code(402).send({ message: error.message });
        }
        if (error instanceof SoldOutError) {
          return reply.code(409).send({ message: error.message });
        }
        throw error;
      }
    },
  );
}
