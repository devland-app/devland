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

const BLINK_INTERVAL_MS: Record<Exclude<BlinkPace, "off">, [number, number]> = {
  calm: [4000, 11000],
  lively: [2200, 5400],
};
const BLINK_DURATION_MS = 160;

// Os mascotes da página se revezam: uma piscada só começa 450 ms depois da anterior, de qualquer
// mascote. Sem isso, com vários na tela, dois acabam piscando juntos por acaso com frequência.
const MIN_GAP_BETWEEN_BLINKS_MS = 450;
let lastBlinkAt = Number.NEGATIVE_INFINITY;

function useBlink(pace: BlinkPace): boolean {
  const [blinking, setBlinking] = useState(false);

  useEffect(() => {
    if (pace === "off" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const [min, max] = BLINK_INTERVAL_MS[pace];
    let timer = 0;
    // O intervalo é sorteado a cada piscada: cada mascote pisca no seu próprio ritmo.
    const scheduleBlink = (delay: number) => {
      timer = window.setTimeout(() => {
        const now = performance.now();
        if (now - lastBlinkAt < MIN_GAP_BETWEEN_BLINKS_MS) {
          scheduleBlink(MIN_GAP_BETWEEN_BLINKS_MS + Math.random() * 600);
          return;
        }
        lastBlinkAt = now;
        setBlinking(true);
        timer = window.setTimeout(() => {
          setBlinking(false);
          scheduleBlink(min + Math.random() * (max - min));
        }, BLINK_DURATION_MS);
      }, delay);
    };
    scheduleBlink(min + Math.random() * (max - min));
    return () => window.clearTimeout(timer);
  }, [pace]);

  return blinking;
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
}: MascotArtProps) {
  const instanceId = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const [drawing, setDrawing] = useState<Drawing>({ status: "loading" });
  const blinking = useBlink(blink);

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

  const classes = ["mascot-art", blinking && "is-blinking", className].filter(Boolean).join(" ");

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
