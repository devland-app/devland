import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { buildApp } from "../app.js";
import { createDatabase } from "../shared/database.js";

// Gera docs/openapi.yaml a partir das rotas, sem subir servidor nem banco: o Knex só abre conexão
// na primeira consulta, e aqui nenhuma consulta é feita. O CI roda este script e falha se o arquivo
// versionado estiver diferente do gerado, então o contrato publicado nunca fica para trás do código.
const OUTPUT = fileURLToPath(new URL("../../../../docs/openapi.yaml", import.meta.url));

const db = createDatabase("postgres://openapi:openapi@localhost:5432/openapi");
const app = await buildApp({ logger: false, db, corsOrigins: [] });
try {
  await app.ready();
  writeFileSync(OUTPUT, app.swagger({ yaml: true }));
  process.stdout.write(`OpenAPI exportado para ${OUTPUT}\n`);
} finally {
  await app.close();
  await db.destroy();
}
