import { useEffect, useRef, useState } from "react";

import type { Product } from "../../shared/api/types.ts";
import { useSound } from "../../shared/sound/soundContext.ts";
import { MascotArt } from "../../shared/ui/MascotArt.tsx";

type Reaction = "jump" | "wiggle" | "giggle" | "spin";

// Cada clique mostra a próxima reação da lista; todas deixam o mascote sorrindo.
const REACTIONS: Reaction[] = ["jump", "wiggle", "giggle", "spin"];
const REACTION_MS: Record<Reaction, number> = { jump: 720, wiggle: 640, giggle: 900, spin: 860 };

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
    const name = REACTIONS[clicks.current % REACTIONS.length] ?? "jump";
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
        className={reaction ? `is-${reaction.name} is-happy` : undefined}
        restartKey={reaction?.id ?? 0}
      />
      <span className="mascot-shadow" aria-hidden="true" />
    </button>
  );
}
