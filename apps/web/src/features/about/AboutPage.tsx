import "./about.css";

import { API_DOCS_URL } from "../../shared/api/client.ts";
import type { Product } from "../../shared/api/types.ts";
import { ExternalLink } from "../../shared/ui/ExternalLink.tsx";
import { MascotArt } from "../../shared/ui/MascotArt.tsx";
import { useProducts } from "../../shared/useProducts.ts";
import { ABOUT_SECTIONS, REPOSITORY_URL } from "./aboutSections.tsx";

export function AboutPage() {
  const { state } = useProducts();
  // Os desenhos vêm do catálogo. Se ele não carregar, a página continua inteira, só sem os mascotes.
  const mascots = new Map<string, Product>(
    state.status === "ready" ? state.products.map((product) => [product.slug, product]) : [],
  );

  return (
    <section className="about" aria-labelledby="about-title">
      <div className="intro intro--center">
        <h1 id="about-title">
          Por trás da <em>DevLand</em>
        </h1>
        <p>
          A DevLand é o projeto final do curso de Engenharia de Software do Geração Tech 4.0, feito
          por Flávia Reis. A ideia é aprender DevOps brincando: os quizzes rendem moedas, e as
          moedas adotam mascotes que explicam cada conceito. O próprio site usa tudo o que os
          mascotes ensinam. Abra cada item para ver como ele foi construído.
        </p>
      </div>

      <div className="about-list">
        {ABOUT_SECTIONS.map((section) => {
          const mascot = mascots.get(section.mascot);
          return (
            <details key={section.id} className="about-item clay">
              <summary>
                <span className="about-art" aria-hidden="true">
                  {mascot && <MascotArt product={mascot} size={64} blink="off" />}
                </span>
                <span className="about-heading">
                  <span className="about-title">{section.title}</span>
                  <span className="about-teaser">{section.teaser}</span>
                </span>
                <svg
                  className="about-chevron"
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </summary>
              <div className="about-body">{section.body}</div>
            </details>
          );
        })}
      </div>

      <div className="about-cta clay">
        <div>
          <h2>Quer ver por dentro?</h2>
          <p>
            A API é aberta e documentada: dá para ver cada rota e testar direto no navegador. O
            código inteiro também está no GitHub.
          </p>
        </div>
        <div className="about-cta-actions">
          <ExternalLink className="btn btn--lilac" href={API_DOCS_URL}>
            Explorar a API (Swagger)
          </ExternalLink>
          <ExternalLink className="btn btn--soft" href={REPOSITORY_URL}>
            Ver o código no GitHub
          </ExternalLink>
        </div>
      </div>
    </section>
  );
}
