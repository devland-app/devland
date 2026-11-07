---
name: security
description: Regras de segurança do DevLand para segredos, dependências, validação de entrada, autenticação, Docker e CI. Use ao mexer em configuração, variáveis de ambiente, endpoints, Dockerfiles, workflows ou ao revisar um PR.
---

# Segurança no DevLand

## 1. Segredos (regra inegociável)

- Nenhum segredo no repositório: nem em código, nem em `docker-compose.yml`, nem em workflow, nem em
  teste, nem em `docs/`. Isso inclui tokens, senhas, connection strings com senha e chaves de API.
- Local: valores reais em `.env` (já está no `.gitignore`). Ao criar uma variável nova, adicione-a ao
  `.env.example` com valor fictício e uma linha de comentário.
- CI e deploy: GitHub Secrets (`secrets.*`) para valores sensíveis e GitHub Variables (`vars.*`)
  para valores públicos, como nome de usuário do Docker Hub ou URL da API.
- `VITE_*` é embutido no JavaScript do navegador: trate como público.
- Antes de propor um commit, rode `git diff --cached` e procure segredos. O gitleaks roda no
  pre-commit (se instalado) e no CI.
- Se um segredo vazar: **revogue e gere outro primeiro**; só depois limpe o histórico.

## 2. Configuração

- Toda configuração vem do ambiente (`process.env`), validada na inicialização. Falte o que faltar,
  a API falha cedo com mensagem clara, sem imprimir o valor.
- Nunca logue segredos, tokens, headers `Authorization` ou dados de pagamento. Use a opção `redact`
  do pino para esses caminhos.

## 3. Entrada e API

- Valide body, params e query com schema (JSON Schema do Fastify ou zod). Rejeite campos extras.
- Quantidades e preços: inteiros positivos, preços em centavos, e o preço **sempre vem do banco**,
  nunca do cliente.
- Pedidos exigem `Idempotency-Key` para evitar cobrança duplicada.
- Consultas SQL só via ORM ou query parametrizada. Nunca concatene string.
- CORS restrito à origem do front (variável de ambiente), não `*` em produção.
- Respostas de erro não expõem stack trace nem detalhes internos fora de desenvolvimento.

## 4. Dependências

- `npm audit --omit=dev --audit-level=high` precisa passar no CI.
- Adicione dependência só quando necessário, prefira pacotes mantidos e fixe versões pelo lockfile.
- Imagens Docker são escaneadas com Trivy no CI.

## 5. Docker

- Build multi-stage; imagem final só com o necessário para rodar.
- Container roda como usuário não-root (`USER node` / nginx unprivileged).
- `.dockerignore` exclui `.env*`, `.git`, `node_modules` e `.claude`.
- Nunca passe segredo via `ARG` ou `ENV` no Dockerfile: ele fica gravado nas camadas da imagem.

## 6. GitHub Actions

- `permissions: contents: read` por padrão; amplie só no job que precisa.
- Use segredos só nos passos que precisam deles e nunca dê `echo` neles.
- Workflows de `pull_request` vindos de forks não recebem segredos: não tente contornar isso.

Ao revisar, relate: arquivo/linha, risco concreto, severidade (alta/média/baixa) e correção.
