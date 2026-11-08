import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    // Cada arquivo de integração sobe o próprio Postgres (Testcontainers); a subida entra no tempo.
    hookTimeout: 120_000,
    testTimeout: 30_000,
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      // Pontos de entrada sem regra de negócio: subir o processo e exportar o contrato.
      exclude: ["src/server.ts", "src/tracing.ts", "src/scripts/**"],
      reporter: ["text", "json-summary", "html"],
      thresholds: { lines: 90, statements: 90, functions: 90, branches: 80 },
    },
  },
});
