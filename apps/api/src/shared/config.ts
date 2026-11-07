// Lê e valida as variáveis de ambiente uma única vez, na subida da API.
// Se algo estiver errado, a API não sobe: melhor falhar cedo do que no meio de uma requisição.
// As mensagens dizem qual variável está errada, mas nunca mostram o valor (pode ser um segredo).

const NODE_ENVS = ["development", "test", "production"] as const;
const DEFAULT_PORT = 3333;
// Origens do front em desenvolvimento: Vite (5173) e nginx do docker compose (8080).
const DEV_CORS_ORIGINS = ["http://localhost:5173", "http://localhost:8080"];

export type NodeEnv = (typeof NODE_ENVS)[number];

export interface AppConfig {
  nodeEnv: NodeEnv;
  port: number;
  databaseUrl: string;
  corsOrigins: string[];
}

export class ConfigError extends Error {
  constructor(problems: string[]) {
    super(`Configuração inválida:\n- ${problems.join("\n- ")}`);
    this.name = "ConfigError";
  }
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const problems: string[] = [];

  const config: AppConfig = {
    nodeEnv: parseNodeEnv(env.NODE_ENV, problems),
    port: parsePort(env.PORT, problems),
    databaseUrl: parseDatabaseUrl(env.DATABASE_URL, problems),
    corsOrigins: [],
  };
  config.corsOrigins = parseCorsOrigins(env.CORS_ORIGIN, config.nodeEnv, problems);

  if (problems.length > 0) {
    throw new ConfigError(problems);
  }
  return config;
}

function parseNodeEnv(value: string | undefined, problems: string[]): NodeEnv {
  const nodeEnv = value ?? "development";
  if (isNodeEnv(nodeEnv)) {
    return nodeEnv;
  }
  problems.push(`NODE_ENV deve ser um destes valores: ${NODE_ENVS.join(", ")}`);
  return "development";
}

function isNodeEnv(value: string): value is NodeEnv {
  return (NODE_ENVS as readonly string[]).includes(value);
}

function parsePort(value: string | undefined, problems: string[]): number {
  if (value === undefined) {
    return DEFAULT_PORT;
  }
  const port = Number(value);
  if (Number.isInteger(port) && port >= 1 && port <= 65535) {
    return port;
  }
  problems.push("PORT deve ser um número inteiro entre 1 e 65535");
  return DEFAULT_PORT;
}

function parseDatabaseUrl(value: string | undefined, problems: string[]): string {
  if (!value) {
    problems.push("DATABASE_URL é obrigatória (ex.: postgres://usuario:senha@host:5432/banco)");
    return "";
  }
  if (!isPostgresUrl(value)) {
    problems.push("DATABASE_URL deve ser uma URL postgres:// ou postgresql://");
  }
  return value;
}

function isPostgresUrl(value: string): boolean {
  try {
    const { protocol } = new URL(value);
    return protocol === "postgres:" || protocol === "postgresql:";
  } catch {
    return false;
  }
}

// Lista de origens separadas por vírgula. Em produção é obrigatória: CORS aberto para qualquer site
// ("*") deixaria outra página chamar a API em nome de quem a visita.
function parseCorsOrigins(
  value: string | undefined,
  nodeEnv: NodeEnv,
  problems: string[],
): string[] {
  if (!value) {
    if (nodeEnv === "production") {
      problems.push("CORS_ORIGIN é obrigatória em produção (ex.: https://devland.netlify.app)");
    }
    return DEV_CORS_ORIGINS;
  }
  const origins = value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  if (origins.length === 0 || !origins.every(isOrigin)) {
    problems.push("CORS_ORIGIN deve listar origens como https://site.com, separadas por vírgula");
  }
  return origins;
}

// Uma origem é só protocolo + host (+ porta), sem caminho: é o que o navegador manda no cabeçalho Origin.
function isOrigin(value: string): boolean {
  try {
    const url = new URL(value);
    return (url.protocol === "http:" || url.protocol === "https:") && url.origin === value;
  } catch {
    return false;
  }
}
