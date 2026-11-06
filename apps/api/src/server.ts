import { buildApp } from "./app.js";
import { loadConfig, type AppConfig } from "./shared/config.js";

let config: AppConfig;
try {
  config = loadConfig();
} catch (error) {
  // O logger do Fastify ainda não existe aqui: o erro vai direto para o stderr do container.
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

const app = buildApp({ logger: config.nodeEnv !== "test" });

try {
  // 0.0.0.0 é necessário para o container e para o Render receberem tráfego externo.
  await app.listen({ port: config.port, host: "0.0.0.0" });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
