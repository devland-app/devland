import "./catalog.css";

import { ProductCard } from "./ProductCard.tsx";
import { useProducts } from "./useProducts.ts";

const PLACEHOLDER_CARDS = 8;

export function CatalogPage() {
  const { state, retry } = useProducts();

  return (
    <section aria-labelledby="catalog-title">
      <div className="intro">
        <h1 id="catalog-title">
          Miniaturas de massinha que <em>entendem de DevOps</em>
        </h1>
        <p>
          Adote um mascote, encha o carrinho e finalize a compra. O pagamento é de mentirinha: você
          ganha o pedido, a confirmação e os confetes, e ninguém cobra nada.
        </p>
      </div>

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
