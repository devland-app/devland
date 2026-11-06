// Lê e valida as variáveis de ambiente uma única vez, na subida da API.
// Se algo estiver errado, a API não sobe: melhor falhar cedo do que no meio de uma requisição.
// As mensagens dizem qual variável está errada, mas nunca mostram o valor (pode ser um segredo).

const NODE_ENVS = ["development", "test", "production"] as const;
const DEFAULT_PORT = 3333;

export type NodeEnv = (typeof NODE_ENVS)[number];

export interface AppConfig {
  nodeEnv: NodeEnv;
  port: number;
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
  };

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
