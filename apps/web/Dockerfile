# Build context: raiz do monorepo.
# docker build -f apps/web/Dockerfile --build-arg VITE_API_URL=http://localhost:3333 .

FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci --ignore-scripts
COPY apps/web apps/web
# URL pública da API. Vai para o bundle do navegador, então nunca é segredo.
ARG VITE_API_URL=http://localhost:3333
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build -w @devzoo/web
# O COPY preserva a permissão dos arquivos da máquina de origem (o Vite copia public/ como está).
# Se lá estiverem como 600, o nginx não-root não lê. a+rX: todos leem; X dá acesso só às pastas.
RUN chmod -R a+rX apps/web/dist

# Imagem do nginx que já roda como usuário não-root, na porta 8080.
FROM nginxinc/nginx-unprivileged:1.29-alpine AS runtime
# --chmod=644: o usuário nginx precisa ler a config, que pertence ao root.
COPY --chmod=644 apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=3s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/ > /dev/null || exit 1
