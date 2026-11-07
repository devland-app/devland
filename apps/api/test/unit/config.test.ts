import { describe, expect, it } from "vitest";

import { ConfigError, loadConfig } from "../../src/shared/config.js";

const DATABASE_URL = "postgres://devland:devland@localhost:5432/devland";

describe("loadConfig", () => {
  it("usa padrões de desenvolvimento quando só o banco é informado", () => {
    expect(loadConfig({ DATABASE_URL })).toEqual({
      nodeEnv: "development",
      port: 3333,
      databaseUrl: DATABASE_URL,
      corsOrigins: ["http://localhost:5173", "http://localhost:8080"],
    });
  });

  it("lê porta e origens do CORS", () => {
    const config = loadConfig({
      DATABASE_URL,
      PORT: "4000",
      CORS_ORIGIN: "https://devland.app, https://www.devland.app",
    });
    expect(config.port).toBe(4000);
    expect(config.corsOrigins).toEqual(["https://devland.app", "https://www.devland.app"]);
  });

  it("exige CORS_ORIGIN em produção", () => {
    expect(() => loadConfig({ DATABASE_URL, NODE_ENV: "production" })).toThrow(/CORS_ORIGIN/);
  });

  it.each([
    [{ DATABASE_URL: undefined }, /DATABASE_URL é obrigatória/],
    [{ DATABASE_URL: "mysql://localhost/devland" }, /postgres:\/\//],
    [{ DATABASE_URL, PORT: "70000" }, /PORT/],
    [{ DATABASE_URL, NODE_ENV: "staging" }, /NODE_ENV/],
    [{ DATABASE_URL, CORS_ORIGIN: "https://devland.app/loja" }, /CORS_ORIGIN/],
  ])("recusa configuração inválida (%o)", (env, message) => {
    expect(() => loadConfig(env)).toThrow(message);
  });

  it("junta todos os problemas numa mensagem só, sem mostrar valores", () => {
    const error = (() => {
      try {
        loadConfig({ DATABASE_URL: "mysql://usuario:senha-secreta@host/db", PORT: "zero" });
      } catch (caught) {
        return caught;
      }
    })();
    expect(error).toBeInstanceOf(ConfigError);
    expect((error as Error).message).toMatch(/DATABASE_URL[\s\S]*PORT|PORT[\s\S]*DATABASE_URL/);
    expect((error as Error).message).not.toContain("senha-secreta");
  });
});
