import "./quiz.css";

import { useCallback, useEffect, useState } from "react";

import { ApiError, listQuizzes } from "../../shared/api/client.ts";
import type { QuizSummary } from "../../shared/api/types.ts";
import { Coins } from "../../shared/ui/Coins.tsx";
import { MascotArt } from "../../shared/ui/MascotArt.tsx";
import { useProducts } from "../../shared/useProducts.ts";
import { useWallet } from "../../shared/wallet/walletContext.ts";

type QuizList =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; quizzes: QuizSummary[] };

export function QuizListPage() {
  const [list, setList] = useState<QuizList>({ status: "loading" });
  const products = useProducts();
  const { walletId } = useWallet();

  const load = useCallback(() => {
    listQuizzes(walletId).then(
      (quizzes) => setList({ status: "ready", quizzes }),
      (error: unknown) =>
        setList({
          status: "error",
          message:
            error instanceof ApiError ? error.message : "Não deu para carregar os quizzes agora.",
        }),
    );
  }, [walletId]);

  useEffect(load, [load]);

  return (
    <section aria-labelledby="quizzes-title">
      <div className="intro">
        <h1 id="quizzes-title">
          Quizzes que <em>valem moedas</em>
        </h1>
        <p>
          Cada quiz tem 5 perguntas sobre um conceito de DevOps e paga, no total, o preço do mascote
          desse conceito. Cada pergunta paga uma vez, no primeiro acerto; as que você errar
          continuam valendo nos próximos quizzes. Acertando todas, as moedas dão exatamente para
          adotar todos os mascotes. Depois de cada resposta aparece a explicação.
        </p>
      </div>

      {list.status === "loading" && (
        <p className="fine" role="status">
          Buscando os quizzes…
        </p>
      )}
      {list.status === "error" && (
        <div className="catalog-error clay" role="alert">
          <p>{list.message}</p>
          <button className="btn btn--lilac" type="button" onClick={load}>
            Tentar de novo
          </button>
        </div>
      )}
      {list.status === "ready" && (
        <ul className="quiz-grid">
          {list.quizzes.map((quiz) => {
            // O quiz tem o mesmo slug do mascote do conceito: ele aparece como anfitrião.
            const host =
              products.state.status === "ready"
                ? products.state.products.find((product) => product.slug === quiz.slug)
                : undefined;
            return (
              <li key={quiz.slug}>
                <a className="quiz-tile clay" href={`#quiz-${quiz.slug}`}>
                  {host ? (
                    <MascotArt product={host} size={120} />
                  ) : (
                    <span className="quiz-tile-art" aria-hidden="true" />
                  )}
                  <span className="chip">{quiz.concept}</span>
                  <strong>{quiz.title}</strong>
                  <QuizReward quiz={quiz} />
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

// O que o quiz ainda paga para esta carteira.
function QuizReward({ quiz }: { quiz: QuizSummary }) {
  if (quiz.totalCoins > 0 && quiz.earnedCoins >= quiz.totalCoins) {
    return <span className="quiz-tile-reward is-complete">Todas as moedas ganhas ✓</span>;
  }
  if (quiz.earnedCoins > 0) {
    return (
      <span className="quiz-tile-reward">
        Ganhou <Coins value={quiz.earnedCoins} size="sm" /> de {quiz.totalCoins}
      </span>
    );
  }
  return (
    <span className="quiz-tile-reward">
      {quiz.questionCount} perguntas · até <Coins value={quiz.totalCoins} size="sm" />
    </span>
  );
}
