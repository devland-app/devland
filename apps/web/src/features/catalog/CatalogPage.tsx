import "./catalog.css";

import { useAdoptions } from "../../shared/adoptions/adoptionsContext.ts";
import { CollectionProgress } from "../../shared/ui/CollectionProgress.tsx";
import { useProducts } from "../../shared/useProducts.ts";
import { ProductCard } from "./ProductCard.tsx";

const PLACEHOLDER_CARDS = 8;

export function CatalogPage() {
  const { state, retry } = useProducts();
  const adoptions = useAdoptions();

  return (
    <section aria-labelledby="catalog-title">
      <div className="intro">
        <h1 id="catalog-title">
          Mascotes divertidos que <em>explicam DevOps</em>
        </h1>
        <p>
          Responda os quizzes, ganhe moedas e adote os mascotes: acertando todas as perguntas, as
          moedas dão exatamente para adotar todos. Cada mascote desbloqueia uma página com o
          conceito de DevOps que ele representa, explicado de forma simples. As moedas são virtuais:
          nada aqui custa dinheiro.
        </p>
        <a className="btn btn--lilac" href="#quizzes">
          Ganhar moedas nos quizzes
        </a>
      </div>

      {state.status === "ready" && (
        <CollectionProgress adopted={adoptions.adopted.size} total={state.products.length} />
      )}

      {state.status === "error" && (
        <div className="catalog-error clay" role="alert">
          <p>{state.message}</p>
          <button className="btn btn--lilac" type="button" onClick={retry}>
            Tentar de novo
          </button>
        </div>
      )}

      {state.status === "loading" && (
        <div className="grid" aria-busy="true" aria-label="Carregando a vitrine">
          {Array.from({ length: PLACEHOLDER_CARDS }, (_, index) => (
            <div key={index} className="card clay card--placeholder" aria-hidden="true" />
          ))}
        </div>
      )}

      {state.status === "ready" && (
        <div className="grid">
          {state.products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </section>
  );
}
