import { useEffect, useState } from "react";

export type Route = "vitrine" | "pedidos";

// Duas telas só: uma navegação por hash (#vitrine, #pedidos) basta, sem biblioteca de rotas, e o
// nginx não precisa saber de nenhuma URL além da raiz.
function routeFromHash(): Route {
  return window.location.hash === "#pedidos" ? "pedidos" : "vitrine";
}

export function useHashRoute(): Route {
  const [route, setRoute] = useState<Route>(routeFromHash);

  useEffect(() => {
    const onChange = () => setRoute(routeFromHash());
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);

  return route;
}
