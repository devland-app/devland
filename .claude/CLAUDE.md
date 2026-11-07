# DevZoo

Marketplace de miniaturas colecionáveis com mascotes originais inspirados em conceitos de DevOps
(o caranguejo dos contêineres, a lesminha do pipeline, a corujinha das branches). Os mascotes são
criações próprias: não use nomes, logos ou personagens de marcas registradas.

## Visão geral

| Pasta      | O que é                                                                         |
| ---------- | ------------------------------------------------------------------------------- |
| `apps/api` | API em Fastify + TypeScript, monólito modular (`catalog`, `orders`, `payments`) |
| `apps/web` | Vitrine em React + Vite + TypeScript; em produção é servida por nginx           |
| `docs/`    | ADRs, C4, OpenAPI, relatório de desempenho e registro de uso de IA (`ia.md`)    |
| `.github/` | Pipeline de CI: qualidade, varredura de segredos, imagens Docker                |

Monorepo com npm workspaces, Node 22 (`.nvmrc`) e ESM em todo lugar (`"type": "module"`).

## Comandos

| Ação                 | Comando                                                         |
| -------------------- | --------------------------------------------------------------- |
| Instalar             | `npm install` (também ativa os hooks do husky)                  |
| Lint e formatação    | `npm run lint` · `npm run format:check` · `npm run format`      |
| Build                | `npm run build` (compila API e web)                             |
| API em dev           | `npm run dev -w @devzoo/api` (tsx watch, porta 3333)            |
| Web em dev           | `npm run dev -w @devzoo/web` (Vite, porta 5173)                 |
| Subir tudo no Docker | `docker compose up --build` · web em :8080, API em :3333        |
| Estado dos serviços  | `docker compose ps` (todos devem ficar `healthy`)               |
| Gerar o contrato     | `npm run openapi -w @devzoo/api` (atualiza `docs/openapi.yaml`) |
| Lint do contrato     | `npm run lint:openapi` (Redocly, regras em `redocly.yaml`)      |

## Arquitetura da API

- `src/app.ts` monta o Fastify e registra os módulos; `src/server.ts` só lê o ambiente e sobe o
  servidor. Essa separação permite testar com `app.inject()` sem abrir porta.
- Cada módulo fica em `src/modules/<nome>/` e só é importado por outro módulo pelo seu `index.ts`.
- Camadas dentro do módulo: `routes` (HTTP e schema) → `service` (regra de negócio) →
  `repository` (interface + implementação). O service depende da interface, não do banco.
- Cada módulo é dono das próprias tabelas. Dependências permitidas: `orders → catalog`,
  `orders → payments`. `catalog` não depende de ninguém, e `src/shared/` não importa módulos.
- Detalhes e exemplos na skill `modularity`.
- Contrato OpenAPI 3.1 gerado dos JSON Schemas das rotas: Swagger UI em `/docs`, JSON em
  `/docs/json`. Toda rota tem `tags`, `operationId`, `summary` e descrição em cada resposta.
  Modelos reutilizados entram com `app.addSchema` e `$id` (viram components, como `Product`).
- Mudou rota ou schema? Rode `npm run openapi -w @devzoo/api` e commite o `docs/openapi.yaml`:
  o CI regenera o arquivo e falha se o versionado estiver diferente.

## Regras da loja

- É uma loja de brincadeira: nada é vendido nem cobrado, e a interface deixa isso explícito.
  Nunca peça dados de cartão, nome, e-mail ou endereço.
- Sem login nem cadastro. Pedidos têm ID UUID (nunca sequencial, para evitar IDOR): quem tem o
  código vê o pedido. O front guarda os códigos no `localStorage` ("Meus pedidos").
- `POST /orders` exige o header `Idempotency-Key`. A mesma chave devolve o pedido já criado (200 +
  `Idempotent-Replayed: true`), inclusive com dois cliques simultâneos (chave única no banco).
- O cliente envia só `productId` e `quantity`; nome e preço vêm do catálogo e são copiados para o
  pedido. Estoque é conferido ao criar o pedido e baixado no pagamento.
- É uma coleção: cada mascote é adotado uma vez (`MAX_UNITS_PER_PRODUCT = 1` por pedido). O
  front esconde o que já foi adotado ou está aguardando pagamento neste navegador.
- Erros de negócio e de validação saem como `{ "message": "..." }` (`errorResponseSchema` em
  `src/shared/http.ts`); erros 5xx viram mensagem genérica e o detalhe vai só para o log.
- O AJV rejeita campos desconhecidos (`removeAdditional: false`): campo extra no body é 400.
- Pagamento (`POST /orders/{id}/payment`): gateway falso atrás da interface `PaymentGateway`
  (Strategy). Trava o pedido (`FOR UPDATE`), baixa o estoque, aprova e marca como pago numa
  transação só; `broke_toy_card` sempre recusa (402) e a tentativa recusada é gravada fora dela.
  Pagar de novo devolve o mesmo recibo. O banco aceita um único pagamento aprovado por pedido.

## Front

- Estrutura: `src/app/` (casca: cabeçalho e rotas por hash `#vitrine`, `#mascotes` e
  `#mascote-<slug>`), `src/features/<funcionalidade>/` (`catalog`, `cart`, `checkout`,
  `collection`, `mascot`, `theme`, cada uma com o próprio CSS) e `src/shared/` (cliente da API,
  estado compartilhado, formatação, `localStorage`, UI genérica).
- Features não importam umas das outras. Estado usado por várias telas mora em `shared/`:
  `shared/cart` (carrinho, um de cada) e `shared/adoptions` (mascotes adotados e pedidos pendentes,
  derivados dos pedidos salvos neste navegador). A casca liga tudo por props (ex.: `onPayPending`).
- `src/shared/api/client.ts` é o único lugar que chama `fetch`; os tipos em `shared/api/types.ts`
  espelham o `docs/openapi.yaml`. Erros chegam como `ApiError` com a mensagem pronta da API.
- A URL da API vem de `VITE_API_URL` em tempo de build. Tudo que começa com `VITE_` vai para o
  bundle do navegador, então é público.
- Visual "massinha": tokens de cor em `src/styles/global.css` (tema claro e escuro, com
  `data-theme` para a escolha manual), `.clay` para superfícies e `.btn` para botões que afundam
  ao apertar. Cor sempre por token, nunca literal que só funciona num tema.
- Modais e gaveta usam `<dialog>` nativo com `showModal()` (`shared/ui/Dialog.tsx`): foco preso,
  Esc fecha e o foco volta para quem abriu.
- No `localStorage`: `devzoo-cart` (carrinho), `devzoo-orders` (códigos dos pedidos, a base da
  coleção), `devzoo-theme` e `devzoo-banner-dismissed`. Tudo lido com validação, porque pode estar
  vazio, antigo ou indisponível.
- Coleção: cada mascote é adotado uma vez. O botão "Adotar" é liga/desliga (`aria-pressed`,
  "Incluído"); adotado ou aguardando pagamento fica desabilitado. A página de cada mascote mostra a
  `lesson` da API e anima o mascote só com CSS (respeitando `prefers-reduced-motion`).
- Acessibilidade WCAG 2.2 AA (HTML semântico, foco visível, `lang="pt-BR"`): skill `accessibility`.

## Convenções

- Código, arquivos, pastas, branches e mensagens de commit em inglês. Textos de interface e
  comentários em português.
- TypeScript estrito, sem `any`. Nada de `console.log` na API: use `app.log` / `request.log` (pino).
- Dinheiro em centavos (inteiro). O preço de um pedido sempre vem do banco, nunca do cliente.
- Comentários explicam o porquê, não o quê.

## Git

- Repositório: `devzoo-store/devzoo` (organização no GitHub).
- Conventional Commits em inglês, no imperativo e com inicial minúscula, validados pelo commitlint
  no hook `commit-msg`: `feat(api): add product listing`, `fix(web): handle empty catalog`,
  `build: ...`, `ci: ...`, `docs: ...`, `test: ...`.
- Fluxo de branches: `<tipo>/<descricao>` → `develop` → `main`.
  - Toda mudança nasce numa branch criada a partir da `develop`. O prefixo é o mesmo tipo do
    commit e a descrição é em inglês, kebab-case: `feat/catalog-api`, `fix/cors-origin`,
    `chore/update-deps`, `docs/database-adr`, `ci/release-tags`.
  - A branch entra na `develop` por Pull Request.
  - Release: com a `develop` estável, abre-se um PR `develop → main` com título
    `chore(release): vX.Y.Z`. Depois do merge, cria-se a tag e a release no GitHub
    (`git tag vX.Y.Z && git push origin vX.Y.Z`, depois `gh release create vX.Y.Z --generate-notes`).
  - Push na `main` publica as imagens `latest` e `sha-<commit>`; a tag publica `X.Y.Z` e `X.Y`.
  - PRs são integrados com merge commit, não squash: preserva os commits pequenos e mantém
    `develop` e `main` com o mesmo histórico.
  - Nunca commite direto na `main` nem na `develop`.
- O hook `pre-commit` roda gitleaks (se instalado) e lint-staged.
- Não faça commit, push, merge nem abra PR sem pedido explícito.

## Docker e CI

- Imagens multi-stage e não-root (`USER node` na API, `nginx-unprivileged` no web, porta 8080).
- Armadilha conhecida: o `COPY` preserva a permissão do arquivo de origem, e o usuário não-root
  pode ficar sem leitura (o nginx falha com `Permission denied` e o container reinicia em loop).
  - A correção é `chmod -R a+rX` depois dos `COPY` (API em `/app`, web no `dist`).
  - `--chmod=644` só serve em `COPY` para pasta que já existe (como a config do nginx). Se o `COPY`
    criar a pasta, ela também fica `644`, sem `x`, e vira inacessível.
- O Trivy do CI reprova vulnerabilidades HIGH/CRITICAL que já têm correção. Por isso as imagens
  rodam `apk upgrade` e a da API remove npm e corepack, que não são usados em execução. Para checar
  localmente: `docker save devzoo-api -o api.tar` e `aquasec/trivy image --input api.tar`.
- O CI (`.github/workflows/ci.yml`) roda lint, format, build e `npm audit` (SCA), gitleaks e Trivy
  nas imagens. Em push na `main` ou em tag `vX.Y.Z`, publica `devzoo-api` e `devzoo-web` no
  Docker Hub (tags descritas na seção Git).
- O gitleaks roda pelo binário oficial, não pela `gitleaks-action`, que exige licença em
  repositórios de organização.
- O CI depende da variável `DOCKERHUB_USERNAME` (GitHub Variables) e do segredo `DOCKERHUB_TOKEN`
  (GitHub Secrets).

## Segurança

- Nenhum segredo no repositório. Valores reais ficam em `.env` (ignorado) ou no GitHub Secrets.
  Toda variável nova entra no `.env.example` com valor fictício.
- Entrada validada por JSON Schema nas rotas; SQL só parametrizado; CORS restrito à origem do front.
- Detalhes na skill `security`.

## Antes de dizer que está pronto

1. `npm run lint`, `npm run format:check` e `npm run build` passam.
2. Se mexeu em Dockerfile, compose ou dependências: `docker compose up --build -d` e confira se
   todos os serviços ficaram `healthy` e respondem.
3. Variável de ambiente nova está no `.env.example` e no README.
4. Prompt de IA que influenciou uma decisão foi registrado em `docs/ia.md`.
