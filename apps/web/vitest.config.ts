import { defineConfig, mergeConfig } from "vitest/config";

import viteConfig from "./vite.config.ts";

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: "jsdom",
      setupFiles: ["./src/test/setup.ts"],
      include: ["src/**/*.test.{ts,tsx}"],
      coverage: {
        provider: "v8",
        include: ["src/**/*.{ts,tsx}"],
        exclude: ["src/**/*.test.{ts,tsx}", "src/test/**", "src/main.tsx"],
        reporter: ["text", "json-summary", "html"],
        // Limite só onde há regra ou risco: o sanitizador do SVG (segurança), o localStorage, a
        // carteira e o fluxo do quiz. Componentes só visuais não têm limite (ver docs/testes.md).
        thresholds: {
          "src/shared/ui/prepareSvg.ts": { lines: 95, branches: 90 },
          "src/shared/storage.ts": { lines: 95, branches: 90 },
          "src/shared/wallet/WalletProvider.tsx": { lines: 90, branches: 85 },
          "src/features/quiz/QuizPage.tsx": { lines: 85, branches: 80 },
        },
      },
    },
  }),
);
