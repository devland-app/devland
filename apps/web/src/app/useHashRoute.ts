import { useEffect, useState } from "react";

export type Route = { name: "vitrine" } | { name: "mascotes" } | { name: "mascote"; slug: string };

const MASCOT_PREFIX = "#mascote-";

// Poucas telas: uma navegação por hash basta, sem biblioteca de rotas, e o nginx não precisa
// saber de nenhuma URL além da raiz. #mascote-<slug> abre a página de um mascote.
function routeFromHash(): Route {
  const hash = window.location.hash;
  if (hash === "#mascotes") {
    return { name: "mascotes" };
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
