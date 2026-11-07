import type { FastifyInstance } from "fastify";

import { errorResponseSchema } from "../../shared/http.js";
import { WalletNotFoundError, type WalletsService } from "./wallets.service.js";

export const walletSchema = {
  $id: "Wallet",
  type: "object",
  description: "Carteira de moedas virtuais. As moedas não valem dinheiro.",
  additionalProperties: false,
  required: ["id", "balanceCoins", "createdAt"],
  properties: {
    id: {
      type: "string",
      format: "uuid",
      description: "Código da carteira. Sem login, é ele que dá acesso a ela.",
    },
    balanceCoins: { type: "integer", minimum: 0, examples: [120] },
    createdAt: { type: "string", format: "date-time" },
  },
} as const;

interface WalletParams {
  Params: { id: string };
}

export function registerWalletRoutes(app: FastifyInstance, service: WalletsService): void {
  app.addSchema(walletSchema);

  app.post(
    "/wallets",
    {
      schema: {
        tags: ["wallets"],
        operationId: "createWallet",
        summary: "Cria uma carteira de moedas vazia",
        description:
          "Sem login nem cadastro: o navegador guarda o código da carteira. As moedas entram por " +
          "acertos nos quizzes e saem na adoção dos mascotes.",
        response: { 201: { description: "Carteira criada, com saldo zero", $ref: "Wallet#" } },
      },
    },
    async (_request, reply) => reply.code(201).send(await service.createWallet()),
  );

  app.get<WalletParams>(
    "/wallets/:id",
    {
      schema: {
        tags: ["wallets"],
        operationId: "getWallet",
        summary: "Consulta o saldo de uma carteira",
        params: {
          type: "object",
          required: ["id"],
          additionalProperties: false,
          properties: { id: { type: "string", format: "uuid", description: "Código da carteira" } },
        },
        response: {
          200: { description: "A carteira", $ref: "Wallet#" },
          400: { description: "Código em formato inválido", ...errorResponseSchema },
          404: { description: "Nenhuma carteira com esse código", ...errorResponseSchema },
        },
      },
    },
    async (request, reply) => {
      try {
        return await service.getWallet(request.params.id);
      } catch (error) {
        if (error instanceof WalletNotFoundError) {
          return reply.code(404).send({ message: "Carteira não encontrada." });
        }
        throw error;
      }
    },
  );
}
