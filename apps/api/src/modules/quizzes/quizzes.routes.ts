import type { FastifyInstance } from "fastify";

import { errorResponseSchema } from "../../shared/http.js";
import { WalletNotFoundError } from "../wallets/index.js";
import { AlreadyAnsweredError } from "./quizzes.repository.js";
import {
  AttemptNotFoundError,
  InvalidAnswerError,
  QuizNotFoundError,
  type QuizzesService,
} from "./quizzes.service.js";

const quizSummarySchema = {
  $id: "QuizSummary",
  type: "object",
  additionalProperties: false,
  required: ["slug", "title", "concept", "questionCount", "coinsPerCorrectAnswer"],
  properties: {
    slug: {
      type: "string",
      description: "Mesmo slug do mascote do conceito",
      examples: ["caranguejo-dos-conteineres"],
    },
    title: { type: "string", examples: ["O que são contêineres"] },
    concept: { type: "string", examples: ["Contêineres"] },
    questionCount: { type: "integer", description: "Perguntas por tentativa", examples: [5] },
    coinsPerCorrectAnswer: { type: "integer", examples: [20] },
  },
} as const;

const quizAttemptSchema = {
  $id: "QuizAttempt",
  type: "object",
  description: "Tentativa de quiz: as perguntas vêm sem a resposta certa.",
  additionalProperties: false,
  required: ["id", "quizSlug", "title", "concept", "coinsPerCorrectAnswer", "questions"],
  properties: {
    id: { type: "string", format: "uuid", description: "Código da tentativa" },
    quizSlug: { type: "string" },
    title: { type: "string" },
    concept: { type: "string" },
    coinsPerCorrectAnswer: { type: "integer", examples: [20] },
    questions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "prompt", "options"],
        properties: {
          id: { type: "string", examples: ["conteineres-2"] },
          prompt: { type: "string" },
          options: {
            type: "array",
            description: "Em ordem embaralhada a cada tentativa",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["id", "text"],
              properties: { id: { type: "string" }, text: { type: "string" } },
            },
          },
        },
      },
    },
  },
} as const;

const answerResultSchema = {
  $id: "QuizAnswerResult",
  type: "object",
  additionalProperties: false,
  required: [
    "correct",
    "correctOptionId",
    "explanation",
    "coinsAwarded",
    "balanceCoins",
    "answeredCount",
    "questionCount",
  ],
  properties: {
    correct: { type: "boolean" },
    correctOptionId: { type: "string" },
    explanation: { type: "string", description: "Por que a resposta certa é a certa" },
    coinsAwarded: { type: "integer", examples: [20] },
    balanceCoins: { type: "integer", description: "Saldo da carteira depois da resposta" },
    answeredCount: { type: "integer", examples: [3] },
    questionCount: { type: "integer", examples: [5] },
  },
} as const;

const slugPattern = { type: "string", pattern: "^[a-z0-9-]+$", maxLength: 60 } as const;

interface StartAttemptRequest {
  Params: { slug: string };
  Body: { walletId: string };
}

interface AnswerRequest {
  Params: { id: string };
  Body: { questionId: string; optionId: string };
}

export function registerQuizRoutes(app: FastifyInstance, service: QuizzesService): void {
  app.addSchema(quizSummarySchema);
  app.addSchema(quizAttemptSchema);
  app.addSchema(answerResultSchema);

  app.get(
    "/quizzes",
    {
      schema: {
        tags: ["quizzes"],
        operationId: "listQuizzes",
        summary: "Lista os quizzes, um por conceito de DevOps",
        response: {
          200: {
            description: "Quizzes disponíveis",
            type: "array",
            items: { $ref: "QuizSummary#" },
          },
        },
      },
    },
    async () => service.listQuizzes(),
  );

  app.post<StartAttemptRequest>(
    "/quizzes/:slug/attempts",
    {
      schema: {
        tags: ["quizzes"],
        operationId: "startQuizAttempt",
        summary: "Começa uma tentativa de quiz",
        description:
          "Sorteia as perguntas e embaralha as opções. Dá para começar quantas tentativas quiser: " +
          "cada acerto em cada tentativa rende moedas para a carteira informada.",
        params: {
          type: "object",
          required: ["slug"],
          additionalProperties: false,
          properties: { slug: slugPattern },
        },
        body: {
          type: "object",
          additionalProperties: false,
          required: ["walletId"],
          properties: {
            walletId: {
              type: "string",
              format: "uuid",
              description: "Carteira que recebe as moedas",
            },
          },
        },
        response: {
          201: { description: "Tentativa criada", $ref: "QuizAttempt#" },
          400: { description: "Requisição inválida", ...errorResponseSchema },
          404: { description: "Nenhum quiz com esse slug", ...errorResponseSchema },
          422: { description: "Carteira não encontrada", ...errorResponseSchema },
        },
      },
    },
    async (request, reply) => {
      try {
        const attempt = await service.startAttempt(request.params.slug, request.body.walletId);
        return reply.code(201).send(attempt);
      } catch (error) {
        if (error instanceof QuizNotFoundError) {
          return reply.code(404).send({ message: "Quiz não encontrado." });
        }
        if (error instanceof WalletNotFoundError) {
          return reply
            .code(422)
            .send({ message: "Carteira não encontrada. Recarregue a página e tente de novo." });
        }
        throw error;
      }
    },
  );

  app.post<AnswerRequest>(
    "/quiz-attempts/:id/answers",
    {
      schema: {
        tags: ["quizzes"],
        operationId: "answerQuizQuestion",
        summary: "Responde uma pergunta da tentativa",
        description:
          "A API corrige, devolve a resposta certa com a explicação e, se acertou, credita as " +
          "moedas na carteira. Cada pergunta pode ser respondida uma vez por tentativa.",
        params: {
          type: "object",
          required: ["id"],
          additionalProperties: false,
          properties: {
            id: { type: "string", format: "uuid", description: "Código da tentativa" },
          },
        },
        body: {
          type: "object",
          additionalProperties: false,
          required: ["questionId", "optionId"],
          properties: {
            questionId: slugPattern,
            optionId: { type: "string", pattern: "^[a-f0-9]+$", maxLength: 20 },
          },
        },
        response: {
          200: { description: "Resposta corrigida", $ref: "QuizAnswerResult#" },
          400: { description: "Requisição inválida", ...errorResponseSchema },
          404: { description: "Nenhuma tentativa com esse código", ...errorResponseSchema },
          409: { description: "Pergunta já respondida nesta tentativa", ...errorResponseSchema },
          422: { description: "Pergunta ou opção fora desta tentativa", ...errorResponseSchema },
        },
      },
    },
    async (request, reply) => {
      try {
        return await service.answer(
          request.params.id,
          request.body.questionId,
          request.body.optionId,
        );
      } catch (error) {
        if (error instanceof AttemptNotFoundError) {
          return reply.code(404).send({ message: "Tentativa não encontrada." });
        }
        if (error instanceof AlreadyAnsweredError) {
          return reply.code(409).send({ message: "Essa pergunta já foi respondida." });
        }
        if (error instanceof InvalidAnswerError) {
          return reply.code(422).send({ message: error.message });
        }
        throw error;
      }
    },
  );
}
