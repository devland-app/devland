# Build context: raiz do monorepo (o lockfile do npm workspaces fica lá).
# docker build -f apps/api/Dockerfile .

# As etapas que rodam Node usam a arquitetura de quem constrói (--platform=$BUILDPLATFORM). Emulado no
# QEMU, para gerar a imagem ARM, o Node quebrava com "Illegal instruction". O resultado delas é
# JavaScript, que serve para qualquer arquitetura (teste: production-deps.test.ts).
FROM --platform=$BUILDPLATFORM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
# --ignore-scripts: o "prepare" do husky só faz sentido na máquina de quem desenvolve.
RUN npm ci --ignore-scripts
COPY apps/api/tsconfig.json apps/api/
COPY apps/api/src apps/api/src
RUN npm run build -w @devland/api

FROM --platform=$BUILDPLATFORM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
# O mkdir garante a pasta para o COPY da etapa final, mesmo sem dependência aninhada na API.
RUN npm ci --omit=dev --ignore-scripts -w @devland/api \
  && mkdir -p apps/api/node_modules

FROM node:22-alpine AS runtime
ENV NODE_ENV=production
# Aplica as correções de segurança do Alpine publicadas depois do último rebuild da imagem do Node.
RUN apk upgrade --no-cache
WORKDIR /app
COPY package.json ./
COPY apps/api/package.json apps/api/
COPY --from=deps /app/node_modules node_modules
COPY --from=deps /app/apps/api/node_modules apps/api/node_modules
# O COPY preserva a permissão da máquina de origem e o processo roda como "node", que precisa ler
# os package.json (é por eles que o Node sabe que o projeto usa ESM). a+rX: todos leem; X libera pastas.
# npm e corepack saem da imagem: a API não usa nenhum dos dois em execução, e as dependências
# internas deles eram a origem das vulnerabilidades apontadas pelo Trivy.
RUN chmod -R a+rX /app \
  && rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack \
    /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack
COPY --from=build /app/apps/api/dist apps/api/dist
# Ilustrações dos mascotes. Ficam depois das dependências para que trocar um desenho não invalide o cache das
# dependências; o chmod tem o mesmo motivo do anterior (permissão herdada da máquina de origem).
COPY apps/api/static apps/api/static
RUN chmod -R a+rX apps/api/static

USER node
EXPOSE 3333
HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT:-3333}/health" || exit 1
# tracing.js vem antes da API: sem OTEL_EXPORTER_OTLP_ENDPOINT, ele não carrega nada.
CMD ["node", "--import", "./apps/api/dist/tracing.js", "apps/api/dist/server.js"]
