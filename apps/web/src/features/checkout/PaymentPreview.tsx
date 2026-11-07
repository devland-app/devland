import { useEffect, useRef, useState } from "react";

import type { PaymentMethod } from "../../shared/api/types.ts";

// Prévia visual de cada forma de pagamento. Nada aqui coleta dados: não existe campo para digitar
// cartão, de propósito. Por hábito, as pessoas digitam o cartão de verdade, e uma loja simulada não
// deve nem receber esse dado.
export function PaymentPreview({ method, orderId }: { method: PaymentMethod; orderId: string }) {
  return method === "pix" ? (
    <FakePix orderId={orderId} />
  ) : (
    <ToyCard broke={method === "broke_toy_card"} />
  );
}

function FakePix({ orderId }: { orderId: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  // Derivado do pedido: estável entre renderizações e sem nenhum valor de verdade.
  const code = `DEVZOO-SIMULADO-${orderId.slice(0, 8).toUpperCase()}`;
  const [copied, setCopied] = useState<"idle" | "copied" | "failed">("idle");

  useEffect(() => {
    if (canvas.current) drawFakeQr(canvas.current);
  }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied("copied");
    } catch {
      setCopied("failed");
    }
  }

  return (
    <div className="pay-preview">
      <canvas
        ref={canvas}
        className="fake-qr"
        width={210}
        height={210}
        role="img"
        aria-label="QR code ilustrativo, sem valor real"
      />
      <div className="code-row">
        <span className="code">{code}</span>
        <button className="btn btn--soft btn--small" type="button" onClick={copy}>
          {copied === "copied" ? "Copiado" : "Copiar"}
        </button>
      </div>
      {copied === "failed" && <p className="fine">Não deu para copiar: selecione o código.</p>}
    </div>
  );
}

function ToyCard({ broke }: { broke: boolean }) {
  return (
    <div className="pay-preview">
      <div
        className={`toy-card${broke ? " toy-card--broke" : ""}`}
        role="img"
        aria-label={broke ? "Cartão simulado sem saldo" : "Cartão simulado"}
      >
        <span className="sticker">{broke ? "sem saldo" : "simulado"}</span>
        <span className="toy-chip" />
        <span className="toy-number">0000 0000 0000 0000</span>
        <span className="toy-meta">
          <span>Visitante DevZoo</span>
          <span>Val 12/99</span>
        </span>
      </div>
    </div>
  );
}

// Padrão determinístico que lembra um QR code (com os três "olhos" nos cantos), mas não codifica nada.
function drawFakeQr(canvas: HTMLCanvasElement) {
  const context = canvas.getContext("2d");
  if (!context) return;
  const size = 25;
  const cell = canvas.width / size;
  let seed = 7;
  const random = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#2a2140";
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const inFinder = (x < 8 && y < 8) || (x > size - 9 && y < 8) || (x < 8 && y > size - 9);
      if (!inFinder && random() > 0.52) context.fillRect(x * cell, y * cell, cell, cell);
    }
  }
  for (const [fx, fy] of [
    [0, 0],
    [size - 7, 0],
    [0, size - 7],
  ] as const) {
    context.fillStyle = "#2a2140";
    context.fillRect(fx * cell, fy * cell, 7 * cell, 7 * cell);
    context.fillStyle = "#ffffff";
    context.fillRect((fx + 1) * cell, (fy + 1) * cell, 5 * cell, 5 * cell);
    context.fillStyle = "#ff6f4a";
    context.fillRect((fx + 2) * cell, (fy + 2) * cell, 3 * cell, 3 * cell);
  }
}
