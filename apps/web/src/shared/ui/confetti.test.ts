import { afterEach, describe, expect, it, vi } from "vitest";

import { burstConfetti, themeColors } from "./confetti.ts";

describe("confete", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("não desenha nada para quem pede menos movimento", () => {
    vi.stubGlobal("matchMedia", () => ({ matches: true }));
    burstConfetti(["red"]);
    expect(document.querySelector("canvas.confetti")).toBeNull();
  });

  it("sem canvas disponível, tira o elemento e segue em frente", () => {
    expect(() => burstConfetti(["red"])).not.toThrow();
    expect(document.querySelector("canvas.confetti")).toBeNull();
  });

  it("usa as cores do tema atual", () => {
    document.documentElement.style.setProperty("--coral", " #ff6f4a ");
    expect(themeColors()[0]).toBe("#ff6f4a");
  });

  it("desenha os pedaços a cada quadro e some depois de pouco mais de 2 segundos", () => {
    const calls: string[] = [];
    const context = {
      scale: () => calls.push("scale"),
      clearRect: () => calls.push("clear"),
      beginPath: () => {},
      ellipse: () => calls.push("ellipse"),
      fill: () => {},
      fillStyle: "",
    };
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
      context as unknown as CanvasRenderingContext2D,
    );
    const frames: FrameRequestCallback[] = [];
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      frames.push(callback);
      return frames.length;
    });
    const start = performance.now();

    burstConfetti(["#ff6f4a", "#7dd3a8"]);
    expect(document.querySelector("canvas.confetti")).not.toBeNull();

    frames.shift()?.(start + 16);
    expect(calls.filter((call) => call === "ellipse")).toHaveLength(140);
    expect(frames).toHaveLength(1);

    frames.shift()?.(start + 2500);
    expect(document.querySelector("canvas.confetti")).toBeNull();
    expect(frames).toHaveLength(0);
  });
});
