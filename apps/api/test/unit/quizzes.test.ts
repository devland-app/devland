import { beforeEach, describe, expect, it } from "vitest";

import { InMemoryQuestionBank } from "../../src/modules/quizzes/quizzes.bank.js";
import { QUIZ_CONTENT, type QuizContent } from "../../src/modules/quizzes/quizzes.content.js";
import { AlreadyAnsweredError } from "../../src/modules/quizzes/quizzes.repository.js";
import {
  AttemptNotFoundError,
  InvalidAnswerError,
  QUESTIONS_PER_ATTEMPT,
  QuizNotFoundError,
  QuizzesService,
  splitReward,
} from "../../src/modules/quizzes/quizzes.service.js";
import { WalletNotFoundError } from "../../src/modules/wallets/index.js";
import { WalletsService } from "../../src/modules/wallets/wallets.service.js";
import {
  InMemoryAttemptRepository,
  InMemoryWalletRepository,
  runInFakeTransaction,
} from "./fakes.js";

function question(key: string) {
  return {
    key,
    prompt: `Pergunta ${key}?`,
    options: [`certa ${key}`, `errada ${key}`, `outra errada ${key}`] as [string, string, string],
    explanation: `Explicação ${key}`,
  };
}

// Dois quizzes pequenos: um com 5 perguntas (preço divisível) e outro com 7 (sobra na divisão).
const CONTENT: QuizContent[] = [
  {
    slug: "caranguejo",
    title: "Contêineres",
    concept: "Contêineres",
    questions: ["c1", "c2", "c3", "c4", "c5"].map(question),
  },
  {
    slug: "polvo",
    title: "Orquestração",
    concept: "Orquestração",
    questions: ["p1", "p2", "p3", "p4", "p5", "p6", "p7"].map(question),
  },
];
const PRICES = [
  { slug: "caranguejo", priceCoins: 120 },
  { slug: "polvo", priceCoins: 80 },
];

describe("splitReward", () => {
  it.each([
    [120, 5],
    [80, 7],
    [100, 3],
    [7, 10],
  ])("divide %i moedas entre %i perguntas sem sobrar nem faltar", (total, count) => {
    const ids = Array.from({ length: count }, (_, index) => `q${index}`);
    const rewards = [...splitReward(total, ids).values()];
    expect(rewards.reduce((sum, coins) => sum + coins, 0)).toBe(total);
    expect(Math.max(...rewards) - Math.min(...rewards)).toBeLessThanOrEqual(1);
  });

  it("dá a moeda que sobra da divisão às primeiras perguntas", () => {
    expect([...splitReward(80, ["a", "b", "c", "d", "e", "f", "g"]).values()]).toEqual([
      12, 12, 12, 11, 11, 11, 11,
    ]);
  });
});

describe("banco de perguntas", () => {
  const bank = new InMemoryQuestionBank();

  it("tem um quiz por conceito, com 5 perguntas de 3 opções", () => {
    const quizzes = bank.list();
    expect(quizzes).toHaveLength(9);
    for (const quiz of quizzes) {
      expect(quiz.questions).toHaveLength(5);
      for (const item of quiz.questions) {
        expect(item.options).toHaveLength(3);
        expect(new Set(item.options.map((option) => option.text)).size).toBe(3);
      }
    }
  });

  it("usa chaves únicas, porque as respostas gravadas apontam para elas", () => {
    const keys = QUIZ_CONTENT.flatMap((quiz) => quiz.questions.map((item) => item.key));
    expect(new Set(keys).size).toBe(keys.length);
  });

  // A primeira opção do conteúdo é sempre a certa. Se os ids fossem "a", "b", "c", quem olhasse a
  // resposta da API saberia o gabarito mesmo com as opções embaralhadas.
  it("gera ids de opção opacos, que não revelam a posição", () => {
    for (const quiz of bank.list()) {
      for (const item of quiz.questions) {
        for (const option of item.options) {
          expect(option.id).toMatch(/^[a-f0-9]{10}$/);
        }
        expect(item.correctOptionId).toBe(item.options[0]?.id);
      }
    }
  });
});

describe("QuizzesService", () => {
  let wallets: WalletsService;
  let attempts: InMemoryAttemptRepository;
  let service: QuizzesService;
  let walletId: string;

  const bank = new InMemoryQuestionBank(CONTENT);
  const rightOption = (questionId: string) => bank.findQuestion(questionId)?.correctOptionId ?? "";
  const wrongOption = (questionId: string) =>
    bank.findQuestion(questionId)?.options.find((option) => option.id !== rightOption(questionId))
      ?.id ?? "";

  beforeEach(async () => {
    wallets = new WalletsService(new InMemoryWalletRepository());
    attempts = new InMemoryAttemptRepository();
    service = new QuizzesService(
      bank,
      attempts,
      wallets,
      { listProducts: async () => PRICES },
      runInFakeTransaction,
    );
    walletId = (await wallets.createWallet()).id;
  });

  it("diz quanto cada quiz paga: o preço do mascote", async () => {
    const quizzes = await service.listQuizzes();
    expect(quizzes.map((quiz) => [quiz.slug, quiz.totalCoins, quiz.earnedCoins])).toEqual([
      ["caranguejo", 120, 0],
      ["polvo", 80, 0],
    ]);
    expect(quizzes[1]?.questionCount).toBe(QUESTIONS_PER_ATTEMPT);
  });

  it("entrega as perguntas sem o gabarito nem a explicação", async () => {
    const attempt = await service.startAttempt("caranguejo", walletId);
    expect(attempt.questions).toHaveLength(5);
    for (const item of attempt.questions) {
      expect(Object.keys(item).sort()).toEqual([
        "alreadyEarned",
        "coins",
        "id",
        "options",
        "prompt",
      ]);
      expect(item.coins).toBe(24);
      expect(item.alreadyEarned).toBe(false);
    }
  });

  it("recusa quiz inexistente e carteira inexistente", async () => {
    await expect(service.startAttempt("unicornio", walletId)).rejects.toBeInstanceOf(
      QuizNotFoundError,
    );
    await expect(
      service.startAttempt("caranguejo", "00000000-0000-4000-8000-000000000000"),
    ).rejects.toBeInstanceOf(WalletNotFoundError);
  });

  it("paga cada pergunta uma vez só, no primeiro acerto", async () => {
    const first = await service.startAttempt("caranguejo", walletId);
    const target = first.questions[0]?.id ?? "";

    const paid = await service.answer(first.id, target, rightOption(target));
    expect(paid).toMatchObject({ correct: true, coinsAwarded: 24, alreadyEarned: false });
    expect(paid.balanceCoins).toBe(24);

    const second = await service.startAttempt("caranguejo", walletId);
    expect(second.earnedCoins).toBe(24);
    expect(second.questions.find((item) => item.id === target)?.alreadyEarned).toBe(true);

    const repeated = await service.answer(second.id, target, rightOption(target));
    expect(repeated).toMatchObject({ correct: true, coinsAwarded: 0, alreadyEarned: true });
    expect((await wallets.getWallet(walletId)).balanceCoins).toBe(24);
  });

  it("não paga erro, mas a pergunta continua valendo para depois", async () => {
    const first = await service.startAttempt("caranguejo", walletId);
    const target = first.questions[0]?.id ?? "";

    const missed = await service.answer(first.id, target, wrongOption(target));
    expect(missed).toMatchObject({ correct: false, coinsAwarded: 0, alreadyEarned: false });
    expect(missed.correctOptionId).toBe(rightOption(target));
    expect(missed.explanation).toContain("Explicação");

    const second = await service.startAttempt("caranguejo", walletId);
    const retry = await service.answer(second.id, target, rightOption(target));
    expect(retry.coinsAwarded).toBe(24);
  });

  it("não aceita responder duas vezes a mesma pergunta na mesma tentativa", async () => {
    const attempt = await service.startAttempt("caranguejo", walletId);
    const target = attempt.questions[0]?.id ?? "";
    await service.answer(attempt.id, target, wrongOption(target));
    await expect(service.answer(attempt.id, target, rightOption(target))).rejects.toBeInstanceOf(
      AlreadyAnsweredError,
    );
  });

  it("recusa pergunta fora da tentativa, opção inexistente e tentativa inexistente", async () => {
    const attempt = await service.startAttempt("caranguejo", walletId);
    const target = attempt.questions[0]?.id ?? "";
    await expect(service.answer(attempt.id, "p1", rightOption("p1"))).rejects.toBeInstanceOf(
      InvalidAnswerError,
    );
    await expect(service.answer(attempt.id, target, "0000000000")).rejects.toBeInstanceOf(
      InvalidAnswerError,
    );
    await expect(
      service.answer("00000000-0000-4000-8000-000000000000", target, rightOption(target)),
    ).rejects.toBeInstanceOf(AttemptNotFoundError);
  });

  it("fecha a conta: acertando tudo, a carteira recebe a soma exata dos preços", async () => {
    // O quiz do polvo tem 7 perguntas e cada tentativa sorteia 5: são precisas várias rodadas.
    for (let round = 0; round < 10; round += 1) {
      for (const quiz of CONTENT) {
        const attempt = await service.startAttempt(quiz.slug, walletId);
        for (const item of attempt.questions) {
          await service.answer(attempt.id, item.id, rightOption(item.id));
        }
      }
    }
    const total = PRICES.reduce((sum, product) => sum + product.priceCoins, 0);
    expect((await wallets.getWallet(walletId)).balanceCoins).toBe(total);
    const quizzes = await service.listQuizzes(walletId);
    expect(quizzes.every((quiz) => quiz.earnedCoins === quiz.totalCoins)).toBe(true);
  });

  it("não paga nada em quiz sem mascote correspondente", async () => {
    const orphan = new QuizzesService(
      bank,
      attempts,
      wallets,
      { listProducts: async () => [] },
      runInFakeTransaction,
    );
    const attempt = await orphan.startAttempt("caranguejo", walletId);
    expect(attempt.totalCoins).toBe(0);
    const target = attempt.questions[0]?.id ?? "";
    const result = await orphan.answer(attempt.id, target, rightOption(target));
    expect(result).toMatchObject({ correct: true, coinsAwarded: 0, alreadyEarned: false });
  });
});

describe("bordas do banco de perguntas e da divisão", () => {
  it("recusa conteúdo com pergunta sem opções", () => {
    const broken: QuizContent[] = [
      {
        slug: "vazio",
        title: "Vazio",
        concept: "Vazio",
        questions: [
          {
            key: "v1",
            prompt: "Sem opções?",
            options: [] as unknown as [string, string, string],
            explanation: "",
          },
        ],
      },
    ];
    expect(() => new InMemoryQuestionBank(broken)).toThrow("sem opções");
  });

  it("divide zero moedas sem pagar nada e lida com quiz sem perguntas", () => {
    expect([...splitReward(0, ["a", "b"]).values()]).toEqual([0, 0]);
    expect(splitReward(100, []).size).toBe(0);
  });

  it("um quiz com menos de 5 perguntas usa todas", async () => {
    const short: QuizContent[] = [
      {
        slug: "curto",
        title: "Curto",
        concept: "Curto",
        questions: ["s1", "s2", "s3"].map(question),
      },
    ];
    const wallets = new WalletsService(new InMemoryWalletRepository());
    const service = new QuizzesService(
      new InMemoryQuestionBank(short),
      new InMemoryAttemptRepository(),
      wallets,
      { listProducts: async () => [{ slug: "curto", priceCoins: 10 }] },
      runInFakeTransaction,
    );
    const [summary] = await service.listQuizzes();
    expect(summary?.questionCount).toBe(3);
    const attempt = await service.startAttempt("curto", (await wallets.createWallet()).id);
    expect(attempt.questions.map((item) => item.coins).sort()).toEqual([3, 3, 4]);
  });
});
