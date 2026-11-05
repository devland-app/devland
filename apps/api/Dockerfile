# Build context: raiz do monorepo (o lockfile do npm workspaces fica lá).
# docker build -f apps/api/Dockerfile .

FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
# --ignore-scripts: o "prepare" do husky só faz sentido na máquina de quem desenvolve.
RUN npm ci --ignore-scripts
COPY apps/api/tsconfig.json apps/api/
COPY apps/api/src apps/api/src
RUN npm run build -w @devzoo/api

FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
# O COPY preserva a permissão da máquina de origem e o processo roda como "node", que precisa ler
# os package.json (é por eles que o Node sabe que o projeto usa ESM). a+rX: todos leem; X libera pastas.
RUN chmod -R a+rX /app \
  && npm ci --omit=dev --ignore-scripts -w @devzoo/api \
  && npm cache clean --force
COPY --from=build /app/apps/api/dist apps/api/dist

USER node
EXPOSE 3333
HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT:-3333}/health" || exit 1
CMD ["node", "apps/api/dist/server.js"]
