import { useEffect, useRef, useState } from "react";

import { apiAssetUrl, getMascotSvg } from "../../shared/api/client.ts";
import type { Product } from "../../shared/api/types.ts";
import { useSound } from "../../shared/sound/soundContext.ts";
import { prepareInlineSvg } from "./prepareSvg.ts";

type Reaction = "jump" | "wiggle" | "giggle" | "spin";

// Cada clique mostra a próxima reação da lista; todas deixam o mascote sorrindo.
const REACTIONS: Reaction[] = ["jump", "wiggle", "giggle", "spin"];
const REACTION_MS: Record<Reaction, number> = { jump: 720, wiggle: 640, giggle: 900, spin: 860 };

const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function InteractiveMascot({ product }: { product: Product }) {
  const sound = useSound();
  const [svg, setSvg] = useState<string | null>(null);
  const [blinking, setBlinking] = useState(false);
  const [reaction, setReaction] = useState<{ name: Reaction; id: number } | null>(null);
  const clicks = useRef(0);

  // O SVG vem como texto para poder animar as partes; se falhar, a imagem comum aparece no lugar.
  useEffect(() => {
    let active = true;
    getMascotSvg(product.imageUrl)
      .then((raw) => {
        if (active) setSvg(prepareInlineSvg(raw, product.slug));
      })
      .catch(() => {
        // Sem o SVG inline, o mascote continua visível como <img>, só sem piscar e sorrir.
      });
    return () => {
      active = false;
    };
  }, [product.imageUrl, product.slug]);

  // Pisca em intervalos aleatórios, como um bichinho de verdade (desligado com movimento reduzido).
  useEffect(() => {
    if (prefersReducedMotion()) return;
    let timer = 0;
    const scheduleBlink = () => {
      timer = window.setTimeout(
        () => {
          setBlinking(true);
          timer = window.setTimeout(() => {
            setBlinking(false);
            scheduleBlink();
          }, 160);
        },
        2200 + Math.random() * 3200,
      );
    };
    scheduleBlink();
    return () => window.clearTimeout(timer);
  }, []);

  // A reação dura o tempo da animação e depois o mascote volta ao normal.
  useEffect(() => {
    if (!reaction) return;
    const timer = window.setTimeout(() => setReaction(null), REACTION_MS[reaction.name]);
    return () => window.clearTimeout(timer);
  }, [reaction]);

  function react() {
    const name = REACTIONS[clicks.current % REACTIONS.length] ?? "jump";
    clicks.current += 1;
    setReaction({ name, id: clicks.current });
    sound.play(name);
  }

  const className = [
    "mascot-art",
    blinking && "is-blinking",
    reaction && `is-${reaction.name}`,
    reaction && "is-happy",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type="button"
      className="mascot-button"
      onClick={react}
      aria-label={`Interagir com ${product.name}`}
    >
      {svg ? (
        // A key muda a cada reação: o elemento é recriado e a animação recomeça do início.
        <span
          key={reaction?.id ?? 0}
          className={className}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      ) : (
        <img
          className={className}
          src={apiAssetUrl(product.imageUrl)}
          alt=""
          width={300}
          height={300}
        />
      )}
      <span className="mascot-shadow" aria-hidden="true" />
    </button>
  );
}
