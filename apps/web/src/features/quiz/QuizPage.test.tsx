import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  answerQuizQuestion,
  createWallet,
  getMascotSvg,
  listProducts,
  startQuizAttempt,
} from "../../shared/api/client.ts";
import type { Product, QuizAttempt } from "../../shared/api/types.ts";
import { SoundProvider } from "../../shared/sound/SoundProvider.tsx";
import { WalletProvider } from "../../shared/wallet/WalletProvider.tsx";
import { QuizPage } from "./QuizPage.tsx";

vi.mock("../../shared/api/client.ts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../shared/api/client.ts")>()),
  listProducts: vi.fn(),
  getMascotSvg: vi.fn(),
  createWallet: vi.fn(),
  getWallet: vi.fn(),
  startQuizAttempt: vi.fn(),
  answerQuizQuestion: vi.fn(),
}));

const SLUG = "caranguejo-dos-conteineres";
const WALLET_ID = "11111111-1111-4111-8111-111111111111";

const ATTEMPT: QuizAttempt = {
  id: "tentativa-1",
  quizSlug: SLUG,
  title: "O que são contêineres",
  concept: "Contêineres",
  totalCoins: 120,
  earnedCoins: 0,
  questions: [
    {
      id: "q1",
      prompt: "Pergunta um?",
      options: [
        { id: "o1", text: "Certa um" },
        { id: "o2", text: "Errada um" },
      ],
      coins: 24,
      alreadyEarned: false,
    },
    {
      id: "q2",
      prompt: "Pergunta dois?",
      options: [
        { id: "o3", text: "Certa dois" },
        { id: "o4", text: "Errada dois" },
      ],
      coins: 24,
      alreadyEarned: false,
    },
  ],
};

const CRAB = {
  id: 1,
  slug: SLUG,
  name: "Caranguejo dos Contêineres",
  imageUrl: "/images/mascots/caranguejo.svg",
} as Product;

function renderQuiz() {
  return render(
    <SoundProvider>
      <WalletProvider>
        <QuizPage slug={SLUG} />
      </WalletProvider>
    </SoundProvider>,
  );
}

describe("QuizPage", () => {
  beforeEach(() => {
    vi.mocked(listProducts).mockResolvedValue([CRAB]);
    vi.mocked(getMascotSvg).mockResolvedValue('<svg xmlns="http://www.w3.org/2000/svg"></svg>');
    vi.mocked(createWallet).mockResolvedValue({
      id: WALLET_ID,
      balanceCoins: 0,
      createdAt: "2026-11-07T12:00:00.000Z",
    });
    vi.mocked(startQuizAttempt).mockResolvedValue(ATTEMPT);
    vi.mocked(answerQuizQuestion)
      .mockReset()
      .mockResolvedValueOnce({
        correct: true,
        correctOptionId: "o1",
        explanation: "Explicação um.",
        coinsAwarded: 24,
        alreadyEarned: false,
        balanceCoins: 24,
        answeredCount: 1,
        questionCount: 2,
      })
      .mockResolvedValueOnce({
        correct: false,
        correctOptionId: "o3",
        explanation: "Explicação dois.",
        coinsAwarded: 0,
        alreadyEarned: false,
        balanceCoins: 24,
        answeredCount: 2,
        questionCount: 2,
      });
  });

  it("corrige cada resposta, explica e mostra quanto ainda falta ganhar", async () => {
    const user = userEvent.setup();
    renderQuiz();

    expect(await screen.findByRole("heading", { name: "Pergunta um?" })).toBeInTheDocument();
    expect(startQuizAttempt).toHaveBeenCalledWith(SLUG, WALLET_ID);
    expect(screen.getByText(/Pergunta 1 de 2/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Certa um/ }));
    expect(answerQuizQuestion).toHaveBeenCalledWith("tentativa-1", "q1", "o1");
    expect(await screen.findByRole("heading", { name: /Acertou!/ })).toBeInTheDocument();
    expect(screen.getByText("Explicação um.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Certa um/ })).toHaveClass("is-right");
    expect(screen.getByRole("button", { name: /Errada um/ })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Próxima pergunta" }));
    await user.click(await screen.findByRole("button", { name: /Errada dois/ }));
    expect(await screen.findByRole("heading", { name: "Não foi dessa vez" })).toBeInTheDocument();
    expect(screen.getByText(/continua valendo 24 moedas/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Certa dois/ })).toHaveClass("is-right");
    expect(screen.getByRole("button", { name: /Errada dois/ })).toHaveClass("is-wrong");

    await user.click(screen.getByRole("button", { name: "Ver resultado" }));
    expect(await screen.findByRole("heading", { name: "Você acertou 1 de 2" })).toBeInTheDocument();
    expect(screen.getByText(/Ainda faltam 96 moedas/)).toBeInTheDocument();
  });

  it("mostra o erro da API e deixa tentar de novo", async () => {
    vi.mocked(startQuizAttempt).mockRejectedValueOnce(new Error("fora do ar"));
    const user = userEvent.setup();
    renderQuiz();

    expect(await screen.findByRole("alert")).toHaveTextContent("Algo deu errado");
    await user.click(screen.getByRole("button", { name: "Tentar de novo" }));
    expect(await screen.findByRole("heading", { name: "Pergunta um?" })).toBeInTheDocument();
  });
});
