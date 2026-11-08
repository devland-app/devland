import { useEffect, useRef, useState } from "react";

import type { Product } from "../../shared/api/types.ts";
import { useSound } from "../../shared/sound/soundContext.ts";
import { MascotArt } from "../../shared/ui/MascotArt.tsx";

type Reaction = "trick" | "jump" | "wiggle" | "giggle" | "spin";

// Cada clique mostra a próxima reação da lista; todas deixam o mascote sorrindo. O truque é o
// movimento do próprio desenho, o mesmo que aparece de vez em quando na vitrine: o contêiner do
// caranguejo pula, os checks da lesminha reaparecem... Ele se alterna com as reações do corpo todo.
const REACTIONS: Reaction[] = [
  "trick",
  "jump",
  "trick",
  "wiggle",
  "trick",
  "giggle",
  "trick",
  "spin",
];
const REACTION_MS: Record<Reaction, number> = {
  trick: 1400,
  jump: 720,
  wiggle: 640,
  giggle: 900,
  spin: 860,
};
// O truque usa a classe que a vitrine liga (mascot-art.css); as outras, as animações desta página.
const REACTION_CLASS: Record<Reaction, string> = {
  trick: "is-playing",
  jump: "is-jump",
  wiggle: "is-wiggle",
  giggle: "is-giggle",
  spin: "is-spin",
};

export function InteractiveMascot({ product }: { product: Product }) {
  const sound = useSound();
  const [reaction, setReaction] = useState<{ name: Reaction; id: number } | null>(null);
  const clicks = useRef(0);

  // A reação dura o tempo da animação e depois o mascote volta ao normal.
  useEffect(() => {
    if (!reaction) return;
    const timer = window.setTimeout(() => setReaction(null), REACTION_MS[reaction.name]);
    return () => window.clearTimeout(timer);
  }, [reaction]);

  function react() {
    const name = REACTIONS[clicks.current % REACTIONS.length] ?? "trick";
    clicks.current += 1;
    setReaction({ name, id: clicks.current });
    sound.play(name);
  }

  return (
    <button
      type="button"
      className="mascot-button"
      onClick={react}
      aria-label={`Interagir com ${product.name}`}
    >
      <MascotArt
        product={product}
        size={300}
        blink="lively"
        className={reaction ? `${REACTION_CLASS[reaction.name]} is-happy` : undefined}
        restartKey={reaction?.id ?? 0}
      />
      <span className="mascot-shadow" aria-hidden="true" />
    </button>
  );
}
