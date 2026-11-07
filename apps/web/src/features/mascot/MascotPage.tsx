import "./mascot.css";

import { useState } from "react";

import { useAdoptions } from "../../shared/adoptions/adoptionsContext.ts";
import { apiAssetUrl } from "../../shared/api/client.ts";
import type { Product } from "../../shared/api/types.ts";
import { formatDateTime } from "../../shared/format.ts";
import { useProducts } from "../../shared/useProducts.ts";

const CHEERS = ["Oba!", "Boing!", "Hihi!", "De novo!", "Uhuul!", "Que pulo!"];

interface MascotPageProps {
  slug: string;
}

export function MascotPage({ slug }: MascotPageProps) {
  const { state } = useProducts();
  const adoptions = useAdoptions();

  if (state.status !== "ready" || adoptions.status !== "ready") {
    return (
      <p className="fine" role="status">
        {state.status === "error" ? state.message : "Chamando o mascote…"}
      </p>
    );
  }

  const product = state.products.find((candidate) => candidate.slug === slug);
  if (!product) {
    return (
      <section className="mascot-missing clay">
        <h1>Esse mascote não existe</h1>
        <a className="btn" href="#mascotes">
          Voltar para meus mascotes
        </a>
      </section>
    );
  }

  const adoption = adoptions.adopted.get(product.id);
  if (!adoption) {
    return (
      <section className="mascot-missing clay" aria-labelledby="mascot-title">
        <img src={apiAssetUrl(product.imageUrl)} alt="" width={160} height={160} className="dim" />
        <h1 id="mascot-title">Mascote de {product.concept} ainda não adotado</h1>
        <p>
          Adote este mascote na vitrine para desbloquear a página dele e a explicação do conceito.
        </p>
        <a className="btn" href="#vitrine">
          Ir para a vitrine
        </a>
      </section>
    );
  }

  return (
    <article className="mascot" aria-labelledby="mascot-title">
      <a className="back-link" href="#mascotes">
        ← Meus mascotes
      </a>
      <div className="mascot-layout">
        <MascotStage product={product} />
        <div className="mascot-text">
          <span className="chip">{product.concept}</span>
          <h1 id="mascot-title">{product.name}</h1>
          <p className="mascot-tagline">{product.description}</p>

          <section className="lesson clay" aria-labelledby="lesson-what">
            <h2 id="lesson-what">Em poucas palavras</h2>
            <p>{product.lesson.explanation}</p>
          </section>
          <section className="lesson clay" aria-labelledby="lesson-real">
            <h2 id="lesson-real">Na vida real</h2>
            <p>{product.lesson.realWorld}</p>
          </section>
          <section className="lesson lesson--devzoo clay" aria-labelledby="lesson-devzoo">
            <h2 id="lesson-devzoo">Onde a DevZoo usa isso</h2>
            <p>{product.lesson.inDevZoo}</p>
          </section>

          <p className="fine">
            Adotado em {formatDateTime(adoption.adoptedAt)} · pedido{" "}
            <span className="code">{adoption.orderId.slice(0, 8)}</span>
          </p>
        </div>
      </div>
    </article>
  );
}

// O mascote é um botão: clicar (ou apertar Enter/Espaço) faz ele pular e falar.
function MascotStage({ product }: { product: Product }) {
  const [jumps, setJumps] = useState(0);
  const [cheer, setCheer] = useState<string | null>(null);

  function play() {
    // Sorteio no clique (evento), não na renderização: cada pulo tem uma fala.
    setCheer(CHEERS[Math.floor(Math.random() * CHEERS.length)] ?? "Oba!");
    setJumps((count) => count + 1);
  }

  return (
    <div className="mascot-stage clay">
      <button
        type="button"
        className="mascot-button"
        onClick={play}
        aria-label={`Fazer ${product.name} pular`}
      >
        {/* A key muda a cada clique: o React recria a imagem e a animação de pulo recomeça. */}
        <img
          key={jumps}
          className={jumps > 0 ? "is-jumping" : undefined}
          src={apiAssetUrl(product.imageUrl)}
          alt={`Ilustração de massinha: ${product.name}`}
          width={320}
          height={320}
        />
        <span className="mascot-shadow" aria-hidden="true" />
      </button>
      <p className="cheer" aria-live="polite">
        {cheer && <span key={jumps}>{cheer}</span>}
      </p>
      <p className="fine">Clique no {product.name.split(" ")[0]?.toLowerCase()} para ele pular.</p>
    </div>
  );
}
