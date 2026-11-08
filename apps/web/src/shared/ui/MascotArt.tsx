import "./mascot-art.css";

import { useEffect, useId, useState } from "react";

import { apiAssetUrl, getMascotSvg } from "../api/client.ts";
import type { Product } from "../api/types.ts";
import { prepareInlineSvg } from "./prepareSvg.ts";

// Cada ilustração é baixada uma vez por visita, mesmo aparecendo em várias telas.
const svgCache = new Map<string, Promise<string>>();

function loadSvg(imageUrl: string): Promise<string> {
  let pending = svgCache.get(imageUrl);
  if (!pending) {
    pending = getMascotSvg(imageUrl);
    // Se falhar, a próxima tela tenta de novo em vez de herdar o erro.
    pending.catch(() => svgCache.delete(imageUrl));
    svgCache.set(imageUrl, pending);
  }
  return pending;
}

// "calm" é para telas com vários mascotes: piscadas espaçadas e cada um no seu tempo.
// "lively" é para a página de um mascote só.
export type BlinkPace = "calm" | "lively" | "off";

// Algo que acontece de vez em quando: a cada intervalo sorteado entre min e max, dura "duration".
// Mascotes do mesmo canal se revezam: um só começa "minGap" depois do anterior, de qualquer mascote.
// Sem isso, com vários na tela, dois acabam fazendo a mesma coisa juntos por acaso com frequência.
interface Rhythm {
  interval: [number, number];
  duration: number;
  minGap: number;
  channel: { lastAt: number };
}

const blinkChannel = { lastAt: Number.NEGATIVE_INFINITY };
const BLINK_RHYTHMS: Record<Exclude<BlinkPace, "off">, Rhythm> = {
  calm: { interval: [4000, 11000], duration: 160, minGap: 450, channel: blinkChannel },
  lively: { interval: [2200, 5400], duration: 160, minGap: 450, channel: blinkChannel },
};

// Animações da vitrine: raras e uma de cada vez na página, para enfeitar sem distrair.
const SHOWCASE_RHYTHM: Rhythm = {
  interval: [6000, 15000],
  duration: 1700,
  minGap: 2500,
  channel: { lastAt: Number.NEGATIVE_INFINITY },
};

function useOccasionally(rhythm: Rhythm | null): boolean {
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (!rhythm || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const [min, max] = rhythm.interval;
    let timer = 0;
    // O intervalo é sorteado a cada vez: cada mascote segue o próprio ritmo.
    const schedule = (delay: number) => {
      timer = window.setTimeout(() => {
        const now = performance.now();
        if (now - rhythm.channel.lastAt < rhythm.minGap) {
          schedule(rhythm.minGap * (1 + Math.random() * 1.4));
          return;
        }
        rhythm.channel.lastAt = now;
        setActive(true);
        timer = window.setTimeout(() => {
          setActive(false);
          schedule(min + Math.random() * (max - min));
        }, rhythm.duration);
      }, delay);
    };
    schedule(min + Math.random() * (max - min));
    return () => window.clearTimeout(timer);
  }, [rhythm]);

  return active;
}

type Drawing = { status: "loading" } | { status: "ready"; svg: string } | { status: "failed" };

interface MascotArtProps {
  product: Pick<Product, "imageUrl">;
  // Tamanho da imagem de reserva, usada se o desenho não carregar.
  size: number;
  // Texto para leitor de tela; sem ele, o desenho é decorativo (o nome já está ao lado).
  label?: string;
  blink?: BlinkPace;
  // Classes extras, como as reações da página do mascote.
  className?: string;
  // Mudar o valor recria o desenho, para uma animação CSS recomeçar do início.
  restartKey?: number;
  // Vitrine: de vez em quando, a parte que o desenho marcou (classes act-*) se mexe.
  play?: boolean;
}

// O SVG entra inline (e não como <img>) para dar vida às partes do desenho: os olhos piscam, o
// rosto sorri e o fundo redondo some.
export function MascotArt({
  product,
  size,
  label,
  blink = "calm",
  className,
  restartKey = 0,
  play = false,
}: MascotArtProps) {
  const instanceId = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const [drawing, setDrawing] = useState<Drawing>({ status: "loading" });
  const blinking = useOccasionally(blink === "off" ? null : BLINK_RHYTHMS[blink]);
  const playing = useOccasionally(play ? SHOWCASE_RHYTHM : null);

  useEffect(() => {
    let active = true;
    loadSvg(product.imageUrl)
      .then((raw) => {
        const svg = prepareInlineSvg(raw, `mascot-${instanceId}`);
        if (active) setDrawing(svg ? { status: "ready", svg } : { status: "failed" });
      })
      .catch(() => {
        if (active) setDrawing({ status: "failed" });
      });
    return () => {
      active = false;
    };
  }, [product.imageUrl, instanceId]);

  const classes = ["mascot-art", blinking && "is-blinking", playing && "is-playing", className]
    .filter(Boolean)
    .join(" ");

  if (drawing.status === "failed") {
    return (
      <img
        className={classes}
        src={apiAssetUrl(product.imageUrl)}
        alt={label ?? ""}
        width={size}
        height={size}
      />
    );
  }
  if (drawing.status === "loading") {
    return <span className={`${classes} is-loading`} aria-hidden="true" />;
  }
  return (
    <span
      key={restartKey}
      className={classes}
      {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
      dangerouslySetInnerHTML={{ __html: drawing.svg }}
    />
  );
}
