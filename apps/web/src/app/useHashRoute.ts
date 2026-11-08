import { useEffect, useState } from "react";

export type Route =
  | { name: "vitrine" }
  | { name: "quizzes" }
  | { name: "quiz"; slug: string }
  | { name: "mascotes" }
  | { name: "mascote"; slug: string }
  | { name: "sobre" };

const MASCOT_PREFIX = "#mascote-";
const QUIZ_PREFIX = "#quiz-";

// Poucas telas: uma navegação por hash basta, sem biblioteca de rotas, e o nginx não precisa
// saber de nenhuma URL além da raiz. #mascote-<slug> abre a página de um mascote e #quiz-<slug>,
// o quiz do conceito dele.
function routeFromHash(): Route {
  const hash = window.location.hash;
  if (hash === "#mascotes") {
    return { name: "mascotes" };
  }
  if (hash === "#quizzes") {
    return { name: "quizzes" };
  }
  if (hash === "#sobre") {
    return { name: "sobre" };
  }
  if (hash.startsWith(QUIZ_PREFIX) && hash.length > QUIZ_PREFIX.length) {
    return { name: "quiz", slug: decodeURIComponent(hash.slice(QUIZ_PREFIX.length)) };
  }
  if (hash.startsWith(MASCOT_PREFIX) && hash.length > MASCOT_PREFIX.length) {
    return { name: "mascote", slug: decodeURIComponent(hash.slice(MASCOT_PREFIX.length)) };
  }
  return { name: "vitrine" };
}

export function useHashRoute(): Route {
  const [route, setRoute] = useState<Route>(routeFromHash);

  useEffect(() => {
    const onChange = () => {
      setRoute(routeFromHash());
      // Página nova começa do topo, como numa navegação comum.
      window.scrollTo({ top: 0 });
    };
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);

  return route;
}
