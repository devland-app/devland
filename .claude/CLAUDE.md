# DevLand

Site educativo de DevOps: quizzes rendem moedas virtuais, e as moedas adotam mascotes de massinha
que explicam cada conceito (o caranguejo dos contêineres, a lesminha do pipeline, a corujinha das
branches). Os mascotes são criações próprias: não use nomes, logos ou personagens de marcas
registradas.

## Visão geral

| Pasta      | O que é                                                                                               |
| ---------- | ----------------------------------------------------------------------------------------------------- |
| `apps/api` | API em Fastify + TypeScript, monólito modular (`catalog`, `quizzes`, `wallets`, `orders`, `payments`) |
| `apps/web` | Vitrine e quizzes em React + Vite + TypeScript; em produção é servida por nginx                       |
| `docs/`    | ADRs, C4, OpenAPI, relatório de desempenho e registro de uso de IA (`ia.md`)                          |
| `.github/` | Pipeline de CI: qualidade, varredura de segredos, imagens Docker                                      |

Monorepo com npm workspaces, Node 22 (`.nvmrc`) e ESM em todo lugar (`"type": "module"`).

## Comandos

| Ação                 | Comando                                                                                |
| -------------------- | -------------------------------------------------------------------------------------- |
| Instalar             | `npm install` (também ativa os hooks do husky)                                         |
| Lint e formatação    | `npm run lint` · `npm run format:check` · `npm run format`                             |
| Build                | `npm run build` (compila API e web)                                                    |
| API em dev           | `npm run dev -w @devland/api` (tsx watch, porta 3333)                                  |
| Web em dev           | `npm run dev -w @devland/web` (Vite, porta 5173)                                       |
| Dev com recarga      | `npm run dev:docker` (`compose.dev.yaml`: código montado, API em :3333, Vite em :5173) |
| Subir tudo no Docker | `docker compose up --build` · web em :8080, API em :3333                               |
| Estado dos serviços  | `docker compose ps` (todos devem ficar `healthy`)                                      |
| Testes               | `npm test` (API precisa do Docker: Testcontainers sobe o Postgres)                     |
| Cobertura            | `npm run test:coverage -w @devland/api` (e `-w @devland/web`)                          |
| Gerar o contrato     | `npm run openapi -w @devland/api` (atualiza `docs/openapi.yaml`)                       |
| Lint do contrato     | `npm run lint:openapi` (Redocly, regras em `redocly.yaml`)                             |
| Teste de fumaça (k6) | `docker compose --profile perf run --rm k6` (SLO em `docs/desempenho.md`)              |

## Arquitetura da API

- `src/app.ts` monta o Fastify e registra os módulos; `src/server.ts` só lê o ambiente e sobe o
  servidor. Essa separação permite testar com `app.inject()` sem abrir porta.
- Cada módulo fica em `src/modules/<nome>/` e só é importado por outro módulo pelo seu `index.ts`.
- Camadas dentro do módulo: `routes` (HTTP e schema) → `service` (regra de negócio) →
  `repository` (interface + implementação). O service depende da interface, não do banco.
- Cada módulo é dono das próprias tabelas. Dependências permitidas: `orders → catalog`,
  `orders → payments`, `payments → wallets`, `quizzes → wallets`, `quizzes → catalog`. `catalog` e `wallets` não
  dependem de ninguém, e `src/shared/` não importa módulos. O módulo que depende recebe o outro
  como interface na composição (`app.ts`), nunca a classe concreta.
- `CHECK` em migration que altera tabela vai em SQL direto (`db.raw`): dentro de `alterTable`, o
  `table.check` do Knex monta a query errada. Em `createTable` ele funciona.
- Detalhes e exemplos na skill `modularity`.
- `GET /metrics` (`src/shared/metrics.ts`): um histograma `http_request_duration_seconds` por
  método, molde da rota e status. O rótulo de rota é sempre o molde, nunca a URL com id.
- Contrato OpenAPI 3.1 gerado dos JSON Schemas das rotas: Swagger UI em `/docs`, JSON em
  `/docs/json`. Toda rota tem `tags`, `operationId`, `summary` e descrição em cada resposta.
  Modelos reutilizados entram com `app.addSchema` e `$id` (viram components, como `Product`).
- Mudou rota ou schema? Rode `npm run openapi -w @devland/api` e commite o `docs/openapi.yaml`:
  o CI regenera o arquivo e falha se o versionado estiver diferente.

## Regras da loja

- Nada é vendido nem cobrado: os mascotes são adotados com moedas virtuais, ganhas nos quizzes, e a
  interface diz em linguagem simples que as moedas não valem dinheiro (sem "de mentirinha" ou "de
  brincadeira"). Nunca peça dados de cartão, nome, e-mail ou endereço.
- Moedas: cada carteira (`wallets`) tem saldo e extrato (`wallet_entries`). Crédito e débito são um
  `UPDATE` condicional do saldo (nunca fica negativo) mais uma linha no extrato, cuja referência é
  única por motivo: a mesma resposta de quiz ou o mesmo pedido não movimenta a carteira duas vezes.
- Quizzes: um por conceito, com o mesmo slug do mascote. As perguntas ficam no código
  (`quizzes.content.ts`, a primeira opção é a certa); cada tentativa sorteia 5 e embaralha as
  opções, cujos ids são um hash do texto (não revelam a posição). A API corrige: a pergunta sai sem
  gabarito, e a resposta volta com a certa e a explicação.
- Economia fechada: cada quiz paga, somando as perguntas, o preço do mascote dele (`splitReward`
  divide o preço entre as perguntas). Cada pergunta paga uma vez por carteira, no primeiro acerto
  (referência `carteira:pergunta` única no extrato); errou, ela continua valendo. Acertar tudo dá
  exatamente a soma dos preços: adotando todos, o saldo termina em zero. Mudou preço ou pergunta?
  A soma continua fechando sozinha.
- Sem login nem cadastro. Pedidos e carteiras têm ID UUID (nunca sequencial, para evitar IDOR):
  quem tem o código vê o pedido ou usa a carteira. O front guarda os códigos no `localStorage`.
- `POST /orders` exige o header `Idempotency-Key`. A mesma chave devolve o pedido já criado (200 +
  `Idempotent-Replayed: true`), inclusive com dois cliques simultâneos (chave única no banco).
- O cliente envia só `productId` e `quantity`; nome e preço (em moedas) vêm do catálogo e são
  copiados para o pedido. Estoque é conferido ao criar o pedido e baixado no pagamento.
- É uma coleção: cada mascote é adotado uma vez (`MAX_UNITS_PER_PRODUCT = 1` por pedido). O
  front esconde o que já foi adotado ou está aguardando pagamento neste navegador.
- Erros de negócio e de validação saem como `{ "message": "..." }` (`errorResponseSchema` em
  `src/shared/http.ts`); erros 5xx viram mensagem genérica e o detalhe vai só para o log.
- O AJV rejeita campos desconhecidos (`removeAdditional: false`): campo extra no body é 400.
- Pagamento (`POST /orders/{id}/payment`, body `{ walletId }`): `CoinsPaymentGateway` atrás da
  interface `PaymentGateway` (Strategy). Trava o pedido (`FOR UPDATE`), baixa o estoque, debita as
  moedas e marca como pago numa transação só. Saldo insuficiente recusa (402, "faltam N moedas") e
  a tentativa recusada é gravada fora dela. Pagar de novo devolve o mesmo recibo, sem novo débito.
  O banco aceita um único pagamento aprovado por pedido. Pix e cartão simulados (`pix`,
  `toy_card`, `broke_toy_card`) só existem no histórico de pedidos antigos.

## Front

- Estrutura: `src/app/` (casca: cabeçalho e rotas por hash `#vitrine`, `#quizzes`, `#quiz-<slug>`,
  `#mascotes` e `#mascote-<slug>`), `src/features/<funcionalidade>/` (`catalog`, `quiz`, `cart`,
  `checkout`, `collection`, `mascot`, `wallet`, `sound`, `theme`, cada uma com o próprio CSS) e
  `src/shared/` (cliente da API, estado compartilhado, formatação, `localStorage`, UI genérica).
- Features não importam umas das outras. Estado usado por várias telas mora em `shared/`:
  `shared/cart` (carrinho, um de cada), `shared/adoptions` (mascotes adotados e pedidos pendentes,
  derivados dos pedidos salvos neste navegador) e `shared/wallet` (saldo; a carteira só é criada no
  primeiro uso, por `ensureWallet`). A casca liga tudo por props (ex.: `onPayPending`).
- Mascote desenhado sempre por `shared/ui/MascotArt.tsx`: o SVG entra inline (sanitizado por
  `prepareSvg.ts`), sem o fundo redondo, e cada mascote pisca no seu tempo, revezando com os outros.
  Valores em moedas por `shared/ui/Coins.tsx`.
- Animações da vitrine: o desenho marca a parte que se mexe com uma classe `act-*` (o movimento fica
  em `mascot-art.css`), e o `MascotArt` com `play` liga `is-playing` de vez em quando, um mascote por
  vez. Mascote novo precisa de uma parte `act-*` (o teste dos desenhos confere).
- Feature flags em `shared/flags.ts`, lidas no build (`VITE_FLAG_*`, públicas). Hoje:
  `VITE_FLAG_SHOWCASE_ANIMATIONS` (`false` desliga as animações da vitrine).
- `src/shared/api/client.ts` é o único lugar que chama `fetch`; os tipos em `shared/api/types.ts`
  espelham o `docs/openapi.yaml`. Erros chegam como `ApiError` com a mensagem pronta da API.
- A URL da API vem de `VITE_API_URL` em tempo de build. Tudo que começa com `VITE_` vai para o
  bundle do navegador, então é público.
- Visual "massinha": tokens de cor em `src/styles/global.css` (tema claro e escuro, com
  `data-theme` para a escolha manual), `.clay` para superfícies e `.btn` para botões que afundam
  ao apertar. Cor sempre por token, nunca literal que só funciona num tema.
- Modais e gaveta usam `<dialog>` nativo com `showModal()` (`shared/ui/Dialog.tsx`): foco preso,
  Esc fecha e o foco volta para quem abriu.
- No `localStorage`: `devland-cart` (carrinho), `devland-orders` (códigos dos pedidos, a base da
  coleção), `devland-wallet` (código da carteira), `devland-theme` e `devland-sound`. Tudo lido com
  validação, porque pode estar vazio, antigo ou indisponível.
- Coleção: cada mascote é adotado uma vez. O botão "Adotar" é liga/desliga (`aria-pressed`,
  "Incluído"); adotado ou aguardando pagamento fica desabilitado. A página de cada mascote mostra a
  `lesson` da API e anima o mascote só com CSS (respeitando `prefers-reduced-motion`).
- Acessibilidade WCAG 2.2 AA (HTML semântico, foco visível, `lang="pt-BR"`): skill `accessibility`.

## Convenções

- Código, arquivos, pastas, branches e mensagens de commit em inglês. Textos de interface e
  comentários em português.
- TypeScript estrito, sem `any`. Nada de `console.log` na API: use `app.log` / `request.log` (pino).
- Valores em moedas (inteiro). O preço de um pedido sempre vem do banco, nunca do cliente.
- Comentários explicam o porquê, não o quê.

## Git

- Repositório: `devland-app/devland` (organização no GitHub).
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
  localmente: `docker save devland-api -o api.tar` e `aquasec/trivy image --input api.tar`.
- O CI (`.github/workflows/ci.yml`) roda lint, format, build e `npm audit` (SCA), gitleaks e Trivy
  nas imagens. Em push na `main` ou em tag `vX.Y.Z`, publica `devland-api` e `devland-web` no
  Docker Hub (tags descritas na seção Git).
- O gitleaks roda pelo binário oficial, não pela `gitleaks-action`, que exige licença em
  repositórios de organização.
- O CI depende da variável `DOCKERHUB_USERNAME` (GitHub Variables) e do segredo `DOCKERHUB_TOKEN`
  (GitHub Secrets).

## Deploy

- Vercel (site na CDN e API como função em `gru1`) + Neon (PostgreSQL em `aws-sa-east-1`), criados
  pelo Terraform em `infra/` (rodado pela imagem `hashicorp/terraform`; estado e `terraform.tfvars`
  ficam fora do git). Detalhes em `infra/README.md`.
- `api/index.js` (raiz) reexporta `apps/api/dist/vercel.js`: tira o prefixo `/api` e entrega a
  requisição ao mesmo `buildApp` do Docker. O `vercel.json` manda `/api/*` para essa função e
  inclui as ilustrações e os arquivos do Swagger UI.
- Na Vercel a API não roda migrations ao subir: o job `deploy` do CI roda `npm run migrate` antes de
  publicar. O Docker continua migrando na subida (`server.ts`).
- O site é construído com `VITE_API_URL=/api` (`npm run build:vercel`): mesmo domínio, sem CORS.
- Catálogo com `Cache-Control` de CDN (`s-maxage=30, stale-while-revalidate=300`) e ilustrações
  `immutable` (o endereço muda quando o desenho muda).
- O CI testa o `docker compose` em x64 e ARM e publica as imagens para as duas arquiteturas.
- Armadilha: o carregador das funções da Vercel não aceita `require()` de módulo ES (o Node 22
  aceita, então localmente tudo passa). Dependência CommonJS que passe a exigir um pacote só-ESM
  derruba a API só em produção (`FUNCTION_INVOCATION_FAILED`). Correção: `overrides` no
  `package.json` raiz (hoje, `content-disposition` 2.0.1 dentro do `@fastify/static`). O CI roda
  `npm run check:serverless -w @devland/api` com essa limitação depois do build.
- No GitHub Actions, `cond && '' || 'x'` sempre dá `'x'` (string vazia conta como falso): inverta a
  condição para que o valor vazio fique no fim.

## Segurança

- Nenhum segredo no repositório. Valores reais ficam em `.env` (ignorado) ou no GitHub Secrets.
  Toda variável nova entra no `.env.example` com valor fictício.
- Entrada validada por JSON Schema nas rotas; SQL só parametrizado; CORS restrito à origem do front.
- Detalhes na skill `security`.

## Antes de dizer que está pronto

1. `npm run lint`, `npm run format:check`, `npm run build` e `npm test` passam. Regra nova na API
   ganha teste unitário; rota nova ganha teste de integração (`apps/api/test/integration`).
2. Se mexeu em Dockerfile, compose ou dependências: `docker compose up --build -d` e confira se
   todos os serviços ficaram `healthy` e respondem.
3. Variável de ambiente nova está no `.env.example` e no README.
4. Prompt de IA que influenciou uma decisão foi registrado em `docs/ia.md`.
