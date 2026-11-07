import "./quiz.css";

import { useEffect, useRef, useState, type RefObject } from "react";

import { answerQuizQuestion, ApiError, startQuizAttempt } from "../../shared/api/client.ts";
import type { QuizAnswerResult, QuizAttempt } from "../../shared/api/types.ts";
import { useSound } from "../../shared/sound/soundContext.ts";
import { Coins } from "../../shared/ui/Coins.tsx";
import { burstConfetti, themeColors } from "../../shared/ui/confetti.ts";
import { MascotArt } from "../../shared/ui/MascotArt.tsx";
import { useProducts } from "../../shared/useProducts.ts";
import { useWallet } from "../../shared/wallet/walletContext.ts";

type Phase =
  | { name: "starting" }
  | { name: "failed"; message: string }
  | { name: "asking"; index: number; sending: boolean; error?: string }
  | { name: "answered"; index: number; optionId: string; result: QuizAnswerResult }
  | { name: "finished" };

// Acertos e erros na ordem das perguntas, e as moedas ganhas nesta tentativa.
interface Score {
  marks: boolean[];
  coins: number;
}

const EMPTY_SCORE: Score = { marks: [], coins: 0 };

export function QuizPage({ slug }: { slug: string }) {
  const { ensureWallet, updateBalance, balanceCoins } = useWallet();
  const sound = useSound();
  const products = useProducts();
  const [attempt, setAttempt] = useState<QuizAttempt | null>(null);
  const [phase, setPhase] = useState<Phase>({ name: "starting" });
  const [score, setScore] = useState<Score>(EMPTY_SCORE);
  // Muda a cada "Jogar de novo": o efeito abaixo sorteia uma tentativa nova.
  const [round, setRound] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);

  const host =
    products.state.status === "ready"
      ? products.state.products.find((product) => product.slug === slug)
      : undefined;

  // Cada pergunta, cada correção e o resultado levam o foco para o próprio título: quem usa leitor
  // de tela acompanha o quiz sem procurar onde a página mudou.
  const focusKey =
    phase.name === "asking" || phase.name === "answered"
      ? `${phase.name}-${phase.index}`
      : phase.name;
  useEffect(() => {
    heading.current?.focus();
  }, [focusKey]);

  useEffect(() => {
    let active = true;
    ensureWallet()
      .then((walletId) => startQuizAttempt(slug, walletId))
      .then((started) => {
        if (!active) return;
        setAttempt(started);
        setScore(EMPTY_SCORE);
        setPhase({ name: "asking", index: 0, sending: false });
      })
      .catch((error: unknown) => {
        if (active) setPhase({ name: "failed", message: messageOf(error) });
      });
    return () => {
      active = false;
    };
  }, [ensureWallet, slug, round]);

  function restart() {
    setAttempt(null);
    setPhase({ name: "starting" });
    setRound((current) => current + 1);
  }

  async function answer(index: number, optionId: string) {
    const question = attempt?.questions[index];
    if (!attempt || !question) return;
    setPhase({ name: "asking", index, sending: true });
    try {
      const result = await answerQuizQuestion(attempt.id, question.id, optionId);
      updateBalance(result.balanceCoins);
      setScore((current) => ({
        marks: [...current.marks, result.correct],
        coins: current.coins + result.coinsAwarded,
      }));
      setPhase({ name: "answered", index, optionId, result });
      sound.play(result.correct ? "coin" : "unpop");
    } catch (error) {
      setPhase({ name: "asking", index, sending: false, error: messageOf(error) });
    }
  }

  function next(index: number) {
    if (!attempt) return;
    if (index + 1 < attempt.questions.length) {
      setPhase({ name: "asking", index: index + 1, sending: false });
      return;
    }
    setPhase({ name: "finished" });
    if (score.marks.every(Boolean)) {
      burstConfetti(themeColors());
      sound.play("chime");
    }
  }

  const happy =
    (phase.name === "answered" && phase.result.correct) ||
    (phase.name === "finished" && score.marks.some(Boolean));

  return (
    <section className="quiz" aria-labelledby="quiz-title">
      <a className="back-link" href="#quizzes">
        ← Quizzes
      </a>
      <header className="quiz-head">
        {host && (
          <MascotArt
            product={host}
            size={110}
            blink="lively"
            className={happy ? "is-happy" : undefined}
          />
        )}
        <div>
          <span className="chip">{attempt?.concept ?? "Quiz"}</span>
          <h1 id="quiz-title">{attempt?.title ?? "Preparando o quiz"}</h1>
          {attempt && (
            <p className="quiz-reward">
              Cada acerto vale <Coins value={attempt.coinsPerCorrectAnswer} size="sm" />
            </p>
          )}
        </div>
      </header>

      {phase.name === "starting" && (
        <p className="fine" role="status">
          Sorteando as perguntas…
        </p>
      )}
      {phase.name === "failed" && (
        <div className="catalog-error clay" role="alert">
          <p>{phase.message}</p>
          <button className="btn btn--lilac" type="button" onClick={restart}>
            Tentar de novo
          </button>
        </div>
      )}
      {attempt && (phase.name === "asking" || phase.name === "answered") && (
        <QuestionCard
          attempt={attempt}
          phase={phase}
          marks={score.marks}
          heading={heading}
          onAnswer={answer}
          onNext={next}
        />
      )}
      {attempt && phase.name === "finished" && (
        <div className="quiz-card quiz-result clay">
          <h2 ref={heading} tabIndex={-1}>
            {score.marks.every(Boolean)
              ? "Gabaritou!"
              : `Você acertou ${score.marks.filter(Boolean).length} de ${score.marks.length}`}
          </h2>
          <p>
            Você ganhou <Coins value={score.coins} /> neste quiz. Seu saldo agora é{" "}
            <Coins value={balanceCoins} />.
          </p>
          <p className="fine">
            Pode jogar de novo quando quiser: as perguntas mudam de ordem e cada acerto vale moedas
            outra vez.
          </p>
          <div className="quiz-actions">
            <button className="btn btn--mint" type="button" onClick={restart}>
              Jogar de novo
            </button>
            <a className="btn btn--lilac" href="#vitrine">
              Adotar mascotes
            </a>
            <a className="btn btn--soft" href="#quizzes">
              Outros quizzes
            </a>
          </div>
        </div>
      )}
    </section>
  );
}

interface QuestionCardProps {
  attempt: QuizAttempt;
  phase: Extract<Phase, { name: "asking" | "answered" }>;
  marks: boolean[];
  heading: RefObject<HTMLHeadingElement | null>;
  onAnswer: (index: number, optionId: string) => void;
  onNext: (index: number) => void;
}

function QuestionCard({ attempt, phase, marks, heading, onAnswer, onNext }: QuestionCardProps) {
  const { index } = phase;
  const question = attempt.questions[index];
  if (!question) return null;
  const total = attempt.questions.length;
  const answered = phase.name === "answered" ? phase : null;
  const sending = phase.name === "asking" && phase.sending;

  return (
    <div className="quiz-card clay">
      {/* Uma barrinha por pergunta: verde para acerto, coral para erro, lilás para a atual. */}
      <div className="quiz-steps" aria-hidden="true">
        {attempt.questions.map((item, position) => {
          const mark = marks[position];
          const state =
            mark === undefined
              ? position === index
                ? "is-current"
                : ""
              : mark
                ? "is-right"
                : "is-wrong";
          return <span key={item.id} className={state} />;
        })}
      </div>
      <p className="quiz-count">
        Pergunta {index + 1} de {total}
      </p>
      <h2 ref={answered ? undefined : heading} tabIndex={-1}>
        {question.prompt}
      </h2>
      <div className="quiz-options">
        {question.options.map((option) => {
          const state = !answered
            ? ""
            : option.id === answered.result.correctOptionId
              ? "is-right"
              : option.id === answered.optionId
                ? "is-wrong"
                : "is-faded";
          return (
            <button
              key={option.id}
              type="button"
              className={`quiz-option ${state}`}
              disabled={answered !== null || sending}
              onClick={() => onAnswer(index, option.id)}
            >
              <span className="quiz-option-mark" aria-hidden="true">
                {state === "is-right" ? "✓" : state === "is-wrong" ? "✗" : ""}
              </span>
              <span>
                {option.text}
                {state === "is-right" && <span className="sr-only"> (resposta certa)</span>}
                {state === "is-wrong" && <span className="sr-only"> (sua resposta)</span>}
              </span>
            </button>
          );
        })}
      </div>
      {phase.name === "asking" && phase.error && (
        <p className="error-note" role="alert">
          {phase.error}
        </p>
      )}
      {answered && (
        <div className={`quiz-feedback ${answered.result.correct ? "is-right" : "is-wrong"}`}>
          <h3 ref={heading} tabIndex={-1}>
            {answered.result.correct ? (
              <>
                Acertou! + <Coins value={answered.result.coinsAwarded} />
              </>
            ) : (
              "Não foi dessa vez"
            )}
          </h3>
          <p>{answered.result.explanation}</p>
          <button className="btn btn--mint" type="button" onClick={() => onNext(index)}>
            {index + 1 < total ? "Próxima pergunta" : "Ver resultado"}
          </button>
        </div>
      )}
    </div>
  );
}

function messageOf(error: unknown): string {
  return error instanceof ApiError ? error.message : "Algo deu errado. Tente de novo.";
}
