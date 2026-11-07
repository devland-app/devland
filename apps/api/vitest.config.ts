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
      exclude: ["src/server.ts", "src/scripts/**"],
      reporter: ["text", "json-summary", "html"],
      thresholds: { lines: 85, statements: 85, functions: 85, branches: 75 },
    },
  },
});
