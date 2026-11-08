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
        // Limite global e, nos módulos sensíveis (sanitizador do SVG, localStorage, carteira e quiz),
        // um limite mais alto por arquivo. Ver docs/testes.md.
        thresholds: {
          lines: 90,
          statements: 90,
          functions: 90,
          branches: 85,
          "src/shared/ui/prepareSvg.ts": { lines: 95, branches: 90 },
          "src/shared/storage.ts": { lines: 95, branches: 90 },
          "src/shared/wallet/WalletProvider.tsx": { lines: 90, branches: 85 },
          "src/features/quiz/QuizPage.tsx": { lines: 85, branches: 80 },
        },
      },
    },
  }),
);
