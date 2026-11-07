import "./collection.css";

import { useAdoptions } from "../../shared/adoptions/adoptionsContext.ts";
import { formatDateTime } from "../../shared/format.ts";
import { CollectionProgress } from "../../shared/ui/CollectionProgress.tsx";
import { MascotArt } from "../../shared/ui/MascotArt.tsx";
import { useProducts } from "../../shared/useProducts.ts";

export function CollectionPage() {
  const { state, retry } = useProducts();
  const adoptions = useAdoptions();

  return (
    <section aria-labelledby="collection-title">
      <div className="intro">
        <h1 id="collection-title">Meus mascotes</h1>
        <p>
          Cada mascote adotado tem uma página com o conceito de DevOps que ele representa, explicado
          de forma simples. A coleção fica salva neste navegador.
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

      {(state.status === "loading" || adoptions.status === "loading") &&
        state.status !== "error" && (
          <p className="fine" role="status">
            Buscando sua coleção…
          </p>
        )}

      {state.status === "ready" && adoptions.status === "ready" && (
        <>
          <CollectionProgress adopted={adoptions.adopted.size} total={state.products.length} />
          <ul className="collection">
            {state.products.map((product) => {
              const adoption = adoptions.adopted.get(product.id);
              return (
                <li key={product.id}>
                  {adoption ? (
                    <a className="collected clay" href={`#mascote-${product.slug}`}>
                      <MascotArt product={product} size={150} />
                      <strong>{product.name}</strong>
                      <span className="chip">{product.concept}</span>
                      <span className="fine">Adotado em {formatDateTime(adoption.adoptedAt)}</span>
                    </a>
                  ) : (
                    <div className="locked clay">
                      <div className="locked-art">
                        <MascotArt product={product} size={150} blink="off" />
                        <span className="locked-mark" aria-hidden="true">
                          ?
                        </span>
                      </div>
                      <strong>Ainda não adotado</strong>
                      <span className="chip">{product.concept}</span>
                      <a className="card-link" href="#vitrine">
                        Adotar na vitrine
                      </a>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}
