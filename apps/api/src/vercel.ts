import type { IncomingMessage, ServerResponse } from "node:http";

import type { FastifyInstance } from "fastify";

import { buildApp } from "./app.js";
import { loadConfig } from "./shared/config.js";
import { createDatabase } from "./shared/database.js";

// Na Vercel, a API inteira é uma função: o site chama /api/... no mesmo domínio (sem CORS nem
// requisição de pré-verificação), e o vercel.json manda tudo de /api para cá. A função tira o
// prefixo e entrega a requisição ao mesmo app Fastify do Docker. As migrations não rodam aqui: o
// CI as aplica antes do deploy, e a função sobe mais rápido.
export const API_PREFIX = "/api";

export function stripApiPrefix(url: string): string {
  if (!/^\/api(?=\/|\?|$)/.test(url)) {
    return url;
  }
  const rest = url.slice(API_PREFIX.length);
  return rest.startsWith("/") ? rest : `/${rest}`;
}

// A regra "/api/:path*" do vercel.json faz a Vercel acrescentar "?path=<resto do caminho>" à URL.
// As rotas que recusam parâmetros desconhecidos (como a lista de quizzes) responderiam 400. Sai só o
// parâmetro cujo valor é exatamente o caminho da própria requisição: um "path" de verdade fica.
export function removeRewriteParam(url: string): string {
  const [pathname = "/", query] = url.split(/\?(.*)/s, 2);
  if (!query) {
    return url;
  }
  const params = new URLSearchParams(query);
  let route = pathname.replace(/^\//, "");
  try {
    route = decodeURIComponent(route);
  } catch {
    return url;
  }
  if (params.getAll("path").join("/") !== route) {
    return url;
  }
  params.delete("path");
  const remaining = params.toString();
  return remaining ? `${pathname}?${remaining}` : pathname;
}

// Caminho que a API recebe: sem o prefixo /api e sem o parâmetro que a regra da Vercel acrescenta.
export function toApiUrl(url: string): string {
  return removeRewriteParam(stripApiPrefix(url));
}

type AppFactory = () => Promise<FastifyInstance>;

async function productionApp(): Promise<FastifyInstance> {
  const config = loadConfig();
  return buildApp({
    logger: true,
    db: createDatabase(config.databaseUrl),
    corsOrigins: config.corsOrigins,
    publicPrefix: API_PREFIX,
  });
}

// O app é montado uma vez por instância da função e reaproveitado nas próximas requisições. Se a
// montagem falhar (configuração errada, por exemplo), a próxima requisição tenta de novo.
export function createVercelHandler(createApp: AppFactory = productionApp) {
  let ready: Promise<FastifyInstance> | undefined;

  return async (request: IncomingMessage, response: ServerResponse): Promise<void> => {
    ready ??= createApp()
      .then(async (app) => {
        await app.ready();
        return app;
      })
      .catch((error: unknown) => {
        ready = undefined;
        throw error;
      });
    const app = await ready;
    request.url = toApiUrl(request.url ?? "/");
    app.server.emit("request", request, response);
  };
}

export default createVercelHandler();
