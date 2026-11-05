import { buildApp } from "./app.js";

const DEFAULT_PORT = 3333;

const port = Number(process.env.PORT ?? DEFAULT_PORT);
const app = buildApp();

try {
  // 0.0.0.0 é necessário para o container e para o Render receberem tráfego externo.
  await app.listen({ port, host: "0.0.0.0" });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
