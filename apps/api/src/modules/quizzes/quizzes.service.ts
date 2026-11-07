import { randomInt, randomUUID } from "node:crypto";

import type { Transaction, TransactionRunner } from "../../shared/database.js";
import type { CreditResult, Wallet, WalletMovement } from "../wallets/index.js";
import type { QuestionBank } from "./quizzes.bank.js";
import type { AttemptRepository, EarnedAnswer } from "./quizzes.repository.js";
import type {
  AnswerResult,
  Quiz,
  QuizOption,
  QuizSummary,
  StartedAttempt,
} from "./quizzes.types.js";

export const QUESTIONS_PER_ATTEMPT = 5;

// O que os quizzes usam do módulo de carteiras (quizzes → wallets, nunca o contrário).
export interface CoinCredit {
  getWallet(id: string, trx?: Transaction): Promise<Wallet>;
  credit(movement: WalletMovement, trx: Transaction): Promise<CreditResult>;
}

// O que os quizzes usam do catálogo (quizzes → catalog): o preço de cada mascote.
export interface MascotPrices {
  listProducts(): Promise<Array<{ slug: string; priceCoins: number }>>;
}

export class QuizNotFoundError extends Error {
  constructor(slug: string) {
    super(`Quiz ${slug} não encontrado`);
    this.name = "QuizNotFoundError";
  }
}

export class AttemptNotFoundError extends Error {
  constructor(id: string) {
    super(`Tentativa ${id} não encontrada`);
    this.name = "AttemptNotFoundError";
  }
}

// A pergunta ou a opção enviada não pertence a esta tentativa.
export class InvalidAnswerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidAnswerError";
  }
}

// Embaralhamento de Fisher-Yates: cada ordem tem a mesma chance de sair.
function shuffle<T>(items: readonly T[]): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const other = randomInt(index + 1);
    [result[index], result[other]] = [result[other] as T, result[index] as T];
  }
  return result;
}

// Cada quiz paga, somando todas as perguntas, exatamente o preço do mascote do conceito. O valor é
// dividido entre as perguntas, e o resto da divisão vira uma moeda a mais nas primeiras. Assim,
// acertar todas as perguntas de todos os quizzes dá o suficiente para adotar todos os mascotes,
// sem sobrar nada.
export function splitReward(totalCoins: number, questionIds: string[]): Map<string, number> {
  const base = Math.floor(totalCoins / questionIds.length);
  const extra = totalCoins - base * questionIds.length;
  return new Map(questionIds.map((id, index) => [id, base + (index < extra ? 1 : 0)]));
}

// Regras dos quizzes. Quem corrige é a API: o navegador recebe as perguntas sem o gabarito e só
// descobre a resposta certa depois de responder. Cada pergunta rende moedas uma vez por carteira:
// no primeiro acerto. Errou? Ela continua valendo até ser acertada num próximo quiz.
export class QuizzesService {
  private readonly bank: QuestionBank;
  private readonly attempts: AttemptRepository;
  private readonly wallets: CoinCredit;
  private readonly catalog: MascotPrices;
  private readonly runInTransaction: TransactionRunner;

  constructor(
    bank: QuestionBank,
    attempts: AttemptRepository,
    wallets: CoinCredit,
    catalog: MascotPrices,
    runInTransaction: TransactionRunner,
  ) {
    this.bank = bank;
    this.attempts = attempts;
    this.wallets = wallets;
    this.catalog = catalog;
    this.runInTransaction = runInTransaction;
  }

  async listQuizzes(walletId?: string): Promise<QuizSummary[]> {
    const [prices, earned] = await Promise.all([
      this.prices(),
      walletId ? this.attempts.earnedAnswers(walletId) : Promise.resolve<EarnedAnswer[]>([]),
    ]);
    return this.bank.list().map((quiz) => ({
      slug: quiz.slug,
      title: quiz.title,
      concept: quiz.concept,
      questionCount: Math.min(QUESTIONS_PER_ATTEMPT, quiz.questions.length),
      totalCoins: prices.get(quiz.slug) ?? 0,
      earnedCoins: sumEarned(earned, quiz.slug),
    }));
  }

  // Cada tentativa sorteia as perguntas e embaralha as opções: refazer o quiz exige entender, e não
  // decorar a posição da resposta.
  async startAttempt(slug: string, walletId: string): Promise<StartedAttempt> {
    const quiz = this.bank.find(slug);
    if (!quiz) {
      throw new QuizNotFoundError(slug);
    }
    await this.wallets.getWallet(walletId);
    const [rewards, earned] = await Promise.all([
      this.rewardsFor(quiz),
      this.attempts.earnedAnswers(walletId),
    ]);
    const earnedIds = new Set(earned.map((answer) => answer.questionId));

    const questions = shuffle(quiz.questions).slice(0, QUESTIONS_PER_ATTEMPT);
    const attempt = await this.attempts.create({
      id: randomUUID(),
      quizSlug: quiz.slug,
      walletId,
      questionIds: questions.map((question) => question.id),
    });

    return {
      id: attempt.id,
      quizSlug: quiz.slug,
      title: quiz.title,
      concept: quiz.concept,
      totalCoins: [...rewards.values()].reduce((sum, coins) => sum + coins, 0),
      earnedCoins: sumEarned(earned, quiz.slug),
      questions: questions.map((question) => ({
        id: question.id,
        prompt: question.prompt,
        options: shuffle<QuizOption>(question.options),
        coins: rewards.get(question.id) ?? 0,
        alreadyEarned: earnedIds.has(question.id),
      })),
    };
  }

  async answer(attemptId: string, questionId: string, optionId: string): Promise<AnswerResult> {
    const attempt = await this.attempts.findById(attemptId);
    if (!attempt) {
      throw new AttemptNotFoundError(attemptId);
    }
    const quiz = this.bank.find(attempt.quizSlug);
    const question = attempt.questionIds.includes(questionId)
      ? this.bank.findQuestion(questionId)
      : undefined;
    if (!quiz || !question) {
      throw new InvalidAnswerError("Essa pergunta não faz parte desta tentativa.");
    }
    if (!question.options.some((option) => option.id === optionId)) {
      throw new InvalidAnswerError("Essa opção não existe nesta pergunta.");
    }

    const correct = optionId === question.correctOptionId;
    const reward = correct ? ((await this.rewardsFor(quiz)).get(questionId) ?? 0) : 0;

    // Crédito e resposta na mesma transação. O crédito usa a referência "carteira:pergunta", única
    // no extrato: um segundo acerto da mesma pergunta não rende nada. Se a resposta já existia
    // nesta tentativa (409), a transação inteira é desfeita, crédito incluído.
    const outcome = await this.runInTransaction(async (trx) => {
      const credit =
        reward > 0
          ? await this.wallets.credit(
              {
                walletId: attempt.walletId,
                amountCoins: reward,
                reason: "quiz_answer",
                reference: `${attempt.walletId}:${questionId}`,
              },
              trx,
            )
          : {
              credited: false,
              balanceCoins: (await this.wallets.getWallet(attempt.walletId, trx)).balanceCoins,
            };
      const coinsAwarded = credit.credited ? reward : 0;
      await this.attempts.saveAnswer(
        { attemptId, questionId, optionId, correct, coinsAwarded },
        trx,
      );
      return {
        coinsAwarded,
        alreadyEarned: correct && reward > 0 && !credit.credited,
        balanceCoins: credit.balanceCoins,
        answeredCount: await this.attempts.countAnswers(attemptId, trx),
      };
    });

    return {
      correct,
      correctOptionId: question.correctOptionId,
      explanation: question.explanation,
      ...outcome,
      questionCount: attempt.questionIds.length,
    };
  }

  private async prices(): Promise<Map<string, number>> {
    const products = await this.catalog.listProducts();
    return new Map(products.map((product) => [product.slug, product.priceCoins]));
  }

  // O que cada pergunta do quiz paga. Um quiz sem mascote correspondente não paga nada.
  private async rewardsFor(quiz: Quiz): Promise<Map<string, number>> {
    const price = (await this.prices()).get(quiz.slug) ?? 0;
    return splitReward(
      price,
      quiz.questions.map((question) => question.id),
    );
  }
}

function sumEarned(earned: EarnedAnswer[], quizSlug: string): number {
  return earned
    .filter((answer) => answer.quizSlug === quizSlug)
    .reduce((sum, answer) => sum + answer.coins, 0);
}
