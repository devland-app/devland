import type { AddressInfo } from "node:net";

import { buildApp } from "../app.js";
import { createDatabase } from "../shared/database.js";

// O carregador das funções da Vercel não aceita require() de módulo ES, que o Node 22 aceita.
// Uma dependência CommonJS que passe a fazer isso derruba a API só em produção. O CI roda este
// script com "node --no-experimental-require-module", a mesma limitação: se a API não montar ou
// não responder, o build falha antes do deploy. Usa HTTP de verdade, e não app.inject(), que
// carrega um módulo usado só nos testes.
const db = createDatabase("postgres://check:check@127.0.0.1:1/check");
const app = await buildApp({ logger: false, db, corsOrigins: [] });
try {
  await app.listen({ port: 0, host: "127.0.0.1" });
  const { port } = app.server.address() as AddressInfo;
  for (const path of ["/images/mascots/castor-do-cache.svg", "/docs/json"]) {
    const response = await fetch(`http://127.0.0.1:${port}${path}`);
    if (!response.ok) {
      throw new Error(`${path} respondeu ${response.status}`);
    }
  }
  process.stdout.write("API monta e responde sem require() de módulo ES.\n");
} finally {
  await app.close();
  await db.destroy();
}
