import { readFileSync } from "node:fs";

import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import type { FastifyInstance } from "fastify";

// A especificação OpenAPI 3.1 é gerada a partir dos JSON Schemas das rotas: como é o mesmo schema
// que valida as requisições, a documentação não fica desatualizada em relação ao código.
export async function registerApiDocs(app: FastifyInstance): Promise<void> {
  await app.register(swagger, {
    openapi: {
      openapi: "3.1.0",
      info: {
        title: "DevLand API",
        version: readApiVersion(),
        description:
          "API da DevLand, uma loja simulada de mascotes inspirados em DevOps. " +
          "Nenhuma compra é real e nenhum valor é cobrado.",
      },
      servers: [{ url: "http://localhost:3333", description: "Ambiente local (docker compose)" }],
      // API pública por decisão de produto: a loja não tem login nem cadastro. "security: []" deixa
      // isso explícito no contrato, em vez de parecer que a autenticação foi esquecida.
      security: [],
      tags: [
        { name: "catalog", description: "Vitrine de miniaturas" },
        { name: "quizzes", description: "Quizzes que rendem moedas" },
        { name: "wallets", description: "Carteiras de moedas virtuais" },
        { name: "orders", description: "Pedidos simulados (nada é cobrado)" },
        { name: "health", description: "Saúde da API e do banco" },
      ],
    },
    // Schemas registrados com app.addSchema viram components nomeados pelo $id (ex.: Product),
    // em vez dos nomes genéricos def-0, def-1.
    refResolver: {
      buildLocalReference: (json, _baseUri, _fragment, index) =>
        typeof json.$id === "string" ? json.$id : `def-${index}`,
    },
  });
  await app.register(swaggerUi, { routePrefix: "/docs" });
}

// A versão vem do package.json da API, a mesma das releases. O caminho relativo funciona tanto em
// src/shared (dev) quanto em dist/shared (imagem Docker): os dois ficam dois níveis abaixo dele.
function readApiVersion(): string {
  const packageJson: unknown = JSON.parse(
    readFileSync(new URL("../../package.json", import.meta.url), "utf8"),
  );
  if (
    typeof packageJson === "object" &&
    packageJson !== null &&
    "version" in packageJson &&
    typeof packageJson.version === "string"
  ) {
    return packageJson.version;
  }
  return "0.0.0";
}
