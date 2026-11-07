// Explosão de confete na aprovação: é a "dopamina" da loja. Desligada para quem pede menos movimento.
export function burstConfetti(colors: string[]): void {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return;
  }
  const canvas = document.createElement("canvas");
  canvas.className = "confetti";
  canvas.setAttribute("aria-hidden", "true");
  // Dentro do <dialog> aberto (camada do topo): fora dele o confete ficaria atrás do fundo escuro.
  (document.querySelector("dialog[open]") ?? document.body).append(canvas);

  const scale = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * scale;
  canvas.height = window.innerHeight * scale;
  const context = canvas.getContext("2d");
  if (!context) {
    canvas.remove();
    return;
  }
  context.scale(scale, scale);

  const pieces = Array.from({ length: 140 }, () => ({
    x: window.innerWidth / 2,
    y: window.innerHeight * 0.45,
    vx: (Math.random() - 0.5) * 14,
    vy: -Math.random() * 14 - 4,
    radius: 4 + Math.random() * 5,
    color: colors[Math.floor(Math.random() * colors.length)] ?? "#ff6f4a",
    spin: Math.random() * Math.PI,
  }));

  const start = performance.now();
  const frame = (now: number) => {
    context.clearRect(0, 0, window.innerWidth, window.innerHeight);
    for (const piece of pieces) {
      piece.vy += 0.38;
      piece.x += piece.vx;
      piece.y += piece.vy;
      piece.vx *= 0.99;
      piece.spin += 0.2;
      context.fillStyle = piece.color;
      context.beginPath();
      context.ellipse(
        piece.x,
        piece.y,
        piece.radius,
        piece.radius * Math.abs(Math.cos(piece.spin)) + 1,
        piece.spin,
        0,
        Math.PI * 2,
      );
      context.fill();
    }
    if (now - start < 2200) {
      requestAnimationFrame(frame);
    } else {
      canvas.remove();
    }
  };
  requestAnimationFrame(frame);
}
