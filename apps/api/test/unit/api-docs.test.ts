import { afterAll, describe, expect, it } from "vitest";

import { buildApp } from "../../src/app.js";
import { createDatabase } from "../../src/shared/database.js";
import { API_PREFIX } from "../../src/vercel.js";

// A documentação não consulta o banco: um endereço que nunca é usado basta.
const db = createDatabase("postgres://ninguem:nada@127.0.0.1:1/nenhum");

afterAll(async () => {
  await db.destroy();
});

async function docsOf(publicPrefix?: string) {
  const app = await buildApp({ logger: false, db, corsOrigins: [], publicPrefix });
  const page = await app.inject({ url: "/docs" });
  const spec = (await app.inject({ url: "/docs/json" })).json<{
    servers: Array<{ url: string }>;
  }>();
  await app.close();
  return { page, servers: spec.servers.map((server) => server.url) };
}

describe("documentação da API (Swagger)", () => {
  it("no Docker, a página e o contrato apontam para a própria API", async () => {
    const { page, servers } = await docsOf();
    expect(page.statusCode).toBe(200);
    expect(page.body).toContain('href="/docs/static/swagger-ui.css"');
    expect(servers).toEqual(["http://localhost:3333"]);
  });

  // Na Vercel a API fica em /api do site. Sem o prefixo, a página pedia o CSS e o JS em /docs/static
  // (404 no site) e o "Try it out" mandava as requisições para localhost.
  it("na Vercel, usa o prefixo /api nos arquivos da página e no servidor do contrato", async () => {
    const { page, servers } = await docsOf(API_PREFIX);
    expect(page.body).toContain('href="/api/docs/static/swagger-ui.css"');
    expect(page.body).toContain('src="/api/docs/static/swagger-ui-bundle.js"');
    expect(page.body).not.toContain('"/docs/static/');
    expect(servers).toEqual(["/api"]);
  });
});
