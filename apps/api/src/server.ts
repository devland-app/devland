import { buildApp } from "./app.js";
import { catalogMigrations } from "./modules/catalog/index.js";
import { loadConfig, type AppConfig } from "./shared/config.js";
import { createDatabase, runMigrations, type Migration } from "./shared/database.js";

// Ponto de composição: cada módulo exporta as suas migrations e elas são somadas aqui, em ordem.
const migrations: Migration[] = [...catalogMigrations];

let config: AppConfig;
try {
  config = loadConfig();
} catch (error) {
  // O logger do Fastify ainda não existe aqui: o erro vai direto para o stderr do container.
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

const db = createDatabase(config.databaseUrl);
const app = await buildApp({ logger: config.nodeEnv !== "test", db });
app.addHook("onClose", async () => {
  await db.destroy();
});

// docker compose stop envia SIGTERM: fechar o servidor e o pool evita conexões penduradas no banco.
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    app.log.info({ signal }, "encerrando a API");
    app.close().then(
      () => process.exit(0),
      (error: unknown) => {
        app.log.error(error);
        process.exit(1);
      },
    );
  });
}

try {
  const applied = await runMigrations(db, migrations);
  app.log.info({ applied }, "migrations aplicadas");
  // 0.0.0.0 é necessário para o container e para o Render receberem tráfego externo.
  await app.listen({ port: config.port, host: "0.0.0.0" });
} catch (error) {
  app.log.error(error);
  await app.close();
  process.exit(1);
}
