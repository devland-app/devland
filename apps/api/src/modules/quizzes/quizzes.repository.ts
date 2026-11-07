import type { Database, Transaction } from "../../shared/database.js";
import type { QuizAttempt } from "./quizzes.types.js";

export type NewAttempt = Omit<QuizAttempt, "createdAt">;

export interface NewAnswer {
  attemptId: string;
  questionId: string;
  optionId: string;
  correct: boolean;
  coinsAwarded: number;
}

// A pergunta já foi respondida nesta tentativa (ex.: dois cliques na mesma opção).
export class AlreadyAnsweredError extends Error {
  constructor() {
    super("Esta pergunta já foi respondida nesta tentativa");
    this.name = "AlreadyAnsweredError";
  }
}

// Uma pergunta que já rendeu moedas para a carteira.
export interface EarnedAnswer {
  quizSlug: string;
  questionId: string;
  coins: number;
}

export interface AttemptRepository {
  create(attempt: NewAttempt): Promise<QuizAttempt>;
  earnedAnswers(walletId: string): Promise<EarnedAnswer[]>;
  findById(id: string): Promise<QuizAttempt | undefined>;
  saveAnswer(answer: NewAnswer, trx: Transaction): Promise<void>;
  countAnswers(attemptId: string, trx: Transaction): Promise<number>;
}

interface AttemptRow {
  id: string;
  quiz_slug: string;
  wallet_id: string;
  question_ids: string[];
  created_at: Date;
}

const ATTEMPT_COLUMNS = ["id", "quiz_slug", "wallet_id", "question_ids", "created_at"] as const;
const UNIQUE_VIOLATION = "23505";

export class KnexAttemptRepository implements AttemptRepository {
  private readonly db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  async create(attempt: NewAttempt): Promise<QuizAttempt> {
    const [row] = await this.db<AttemptRow>("quiz_attempts")
      .insert({
        id: attempt.id,
        quiz_slug: attempt.quizSlug,
        wallet_id: attempt.walletId,
        // jsonb: o driver precisa receber o texto JSON, não o array.
        question_ids: JSON.stringify(attempt.questionIds) as unknown as string[],
      })
      .returning([...ATTEMPT_COLUMNS]);
    if (!row) {
      throw new Error(`Tentativa ${attempt.id} não foi gravada`);
    }
    return toAttempt(row);
  }

  async earnedAnswers(walletId: string): Promise<EarnedAnswer[]> {
    const rows = await this.db("quiz_answers as answer")
      .join("quiz_attempts as attempt", "attempt.id", "answer.attempt_id")
      .where("attempt.wallet_id", walletId)
      .andWhere("answer.coins_awarded", ">", 0)
      .select<Array<{ quiz_slug: string; question_id: string; coins_awarded: number }>>(
        "attempt.quiz_slug",
        "answer.question_id",
        "answer.coins_awarded",
      );
    return rows.map((row) => ({
      quizSlug: row.quiz_slug,
      questionId: row.question_id,
      coins: row.coins_awarded,
    }));
  }

  async findById(id: string): Promise<QuizAttempt | undefined> {
    const row = await this.db<AttemptRow>("quiz_attempts")
      .select(...ATTEMPT_COLUMNS)
      .where({ id })
      .first();
    return row ? toAttempt(row) : undefined;
  }

  async saveAnswer(answer: NewAnswer, trx: Transaction): Promise<void> {
    try {
      await trx("quiz_answers").insert({
        attempt_id: answer.attemptId,
        question_id: answer.questionId,
        option_id: answer.optionId,
        correct: answer.correct,
        coins_awarded: answer.coinsAwarded,
      });
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === UNIQUE_VIOLATION
      ) {
        throw new AlreadyAnsweredError();
      }
      throw error;
    }
  }

  async countAnswers(attemptId: string, trx: Transaction): Promise<number> {
    const [row] = await trx("quiz_answers")
      .where({ attempt_id: attemptId })
      .count<Array<{ count: string }>>({ count: "*" });
    return Number(row?.count ?? 0);
  }
}

function toAttempt(row: AttemptRow): QuizAttempt {
  return {
    id: row.id,
    quizSlug: row.quiz_slug,
    walletId: row.wallet_id,
    questionIds: row.question_ids,
    createdAt: row.created_at.toISOString(),
  };
}
