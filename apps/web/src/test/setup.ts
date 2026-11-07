import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// O jsdom não implementa matchMedia. Nos testes ninguém pediu "menos movimento".
vi.stubGlobal(
  "matchMedia",
  (query: string): MediaQueryList =>
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
);

afterEach(() => {
  cleanup();
  localStorage.clear();
});
