// Monta uma tabela em Markdown com a cobertura de cada app, para o resumo da execução no GitHub
// Actions. Lê o coverage-summary.json que o Vitest gera com o reporter "json-summary".
import { existsSync, readFileSync } from "node:fs";

const apps = [
  ["API", "apps/api/coverage/coverage-summary.json"],
  ["Site", "apps/web/coverage/coverage-summary.json"],
];
const metrics = [
  ["lines", "Linhas"],
  ["statements", "Instruções"],
  ["functions", "Funções"],
  ["branches", "Ramos"],
];

const lines = [
  "## Cobertura de testes",
  "",
  `| App | ${metrics.map(([, label]) => label).join(" | ")} |`,
  `| --- | ${metrics.map(() => "---:").join(" | ")} |`,
];
for (const [name, file] of apps) {
  if (!existsSync(file)) {
    lines.push(`| ${name} | ${metrics.map(() => "sem relatório").join(" | ")} |`);
    continue;
  }
  const { total } = JSON.parse(readFileSync(file, "utf8"));
  lines.push(`| ${name} | ${metrics.map(([key]) => `${total[key].pct}%`).join(" | ")} |`);
}
lines.push(
  "",
  "A API tem limite global (linhas 85%, ramos 75%). O site tem limite só nos arquivos com regra ou " +
    "risco; veja docs/testes.md.",
);
process.stdout.write(`${lines.join("\n")}\n`);
