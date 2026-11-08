import { afterEach, describe, expect, it, vi } from "vitest";

// As flags são lidas quando o módulo carrega: cada caso importa de novo, com a variável trocada.
async function loadFlags() {
  vi.resetModules();
  return (await import("./flags.ts")).FLAGS;
}

describe("feature flags", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("as animações da vitrine ficam ligadas sem a variável", async () => {
    vi.stubEnv("VITE_FLAG_SHOWCASE_ANIMATIONS", undefined);
    expect((await loadFlags()).showcaseAnimations).toBe(true);
  });

  it('"false" desliga as animações da vitrine', async () => {
    vi.stubEnv("VITE_FLAG_SHOWCASE_ANIMATIONS", "false");
    expect((await loadFlags()).showcaseAnimations).toBe(false);
  });
});
