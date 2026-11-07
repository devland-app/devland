import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// O jsdom não implementa matchMedia. Nos testes ninguém pediu "menos movimento". Definido direto no
// window (e não com vi.stubGlobal) para que um teste possa trocá-lo e o original volte depois.
Object.defineProperty(window, "matchMedia", {
  configurable: true,
  writable: true,
  value: (query: string): MediaQueryList =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList,
});

// O jsdom não implementa o <dialog> modal: o mínimo para abrir, fechar e avisar quem escuta "close".
if (typeof HTMLDialogElement.prototype.showModal !== "function") {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    if (!this.hasAttribute("open")) return;
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
}

// Sem canvas no jsdom: o confete percebe a falta do contexto e não desenha nada.
HTMLCanvasElement.prototype.getContext = () => null;

afterEach(() => {
  cleanup();
  localStorage.clear();
  window.location.hash = "";
  delete document.documentElement.dataset.theme;
});
