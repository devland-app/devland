import { randomInt, randomUUID } from "node:crypto";

import type { Transaction, TransactionRunner } from "../../shared/database.js";
import type { Wallet, WalletMovement } from "../wallets/index.js";
import type { QuestionBank } from "./quizzes.bank.js";
import type { AttemptRepository } from "./quizzes.repository.js";
import type { AnswerResult, QuizOption, QuizSummary, StartedAttempt } from "./quizzes.types.js";

export const QUESTIONS_PER_ATTEMPT = 5;
export const COINS_PER_CORRECT_ANSWER = 20;

// O que os quizzes usam do módulo de carteiras (quizzes → wallets, nunca o contrário).
export interface CoinCredit {
  getWallet(id: string, trx?: Transaction): Promise<Wallet>;
  credit(movement: WalletMovement, trx: Transaction): Promise<number>;
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

// Regras dos quizzes. Quem corrige é a API: o navegador recebe as perguntas sem o gabarito e só
// descobre a resposta certa depois de responder. Cada acerto credita moedas na carteira.
export class QuizzesService {
  private readonly bank: QuestionBank;
  private readonly attempts: AttemptRepository;
  private readonly wallets: CoinCredit;
  private readonly runInTransaction: TransactionRunner;

  constructor(
    bank: QuestionBank,
    attempts: AttemptRepository,
    wallets: CoinCredit,
    runInTransaction: TransactionRunner,
  ) {
    this.bank = bank;
    this.attempts = attempts;
    this.wallets = wallets;
    this.runInTransaction = runInTransaction;
  }

  listQuizzes(): QuizSummary[] {
    return this.bank.list().map((quiz) => ({
      slug: quiz.slug,
      title: quiz.title,
      concept: quiz.concept,
      questionCount: Math.min(QUESTIONS_PER_ATTEMPT, quiz.questions.length),
      coinsPerCorrectAnswer: COINS_PER_CORRECT_ANSWER,
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
      coinsPerCorrectAnswer: COINS_PER_CORRECT_ANSWER,
      questions: questions.map((question) => ({
        id: question.id,
        prompt: question.prompt,
        options: shuffle<QuizOption>(question.options),
      })),
    };
  }

  async answer(attemptId: string, questionId: string, optionId: string): Promise<AnswerResult> {
    const attempt = await this.attempts.findById(attemptId);
    if (!attempt) {
      throw new AttemptNotFoundError(attemptId);
    }
    const question = attempt.questionIds.includes(questionId)
      ? this.bank.findQuestion(questionId)
      : undefined;
    if (!question) {
      throw new InvalidAnswerError("Essa pergunta não faz parte desta tentativa.");
    }
    if (!question.options.some((option) => option.id === optionId)) {
      throw new InvalidAnswerError("Essa opção não existe nesta pergunta.");
    }

    const correct = optionId === question.correctOptionId;
    const coinsAwarded = correct ? COINS_PER_CORRECT_ANSWER : 0;

    // Resposta gravada e moedas creditadas juntas: se a resposta repetir (409), nada é creditado.
    const { balanceCoins, answeredCount } = await this.runInTransaction(async (trx) => {
      await this.attempts.saveAnswer(
        { attemptId, questionId, optionId, correct, coinsAwarded },
        trx,
      );
      const balance = correct
        ? await this.wallets.credit(
            {
              walletId: attempt.walletId,
              amountCoins: coinsAwarded,
              reason: "quiz_answer",
              reference: `${attemptId}:${questionId}`,
            },
            trx,
          )
        : (await this.wallets.getWallet(attempt.walletId, trx)).balanceCoins;
      return {
        balanceCoins: balance,
        answeredCount: await this.attempts.countAnswers(attemptId, trx),
      };
    });

    return {
      correct,
      correctOptionId: question.correctOptionId,
      explanation: question.explanation,
      coinsAwarded,
      balanceCoins,
      answeredCount,
      questionCount: attempt.questionIds.length,
    };
  }
}
