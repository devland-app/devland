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
        title: "DevZoo API",
        version: readApiVersion(),
        description:
          "API da DevZoo, uma loja de brincadeira de miniaturas inspiradas em DevOps. " +
          "Nenhuma compra é real e nenhum valor é cobrado.",
      },
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
