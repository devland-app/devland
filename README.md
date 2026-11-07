**Nível: A (avançado)**

# DevLand

Site educativo de DevOps com mascotes de massinha. Cada conceito (contêineres, CI/CD, controle de
versão, orquestração, deploy, observabilidade, desempenho e segurança) tem um quiz e um mascote. Os
quizzes rendem moedas virtuais, e as moedas adotam os mascotes. Cada mascote adotado desbloqueia
uma página que explica o conceito dele de forma simples.

Projeto final do curso de DevOps e Engenharia de Software do Geração Tech 4.0.

## Como funciona

- **Quizzes:** um por conceito, com 5 perguntas. A API corrige: a pergunta chega sem o gabarito, e
  a resposta volta com a explicação.
- **Moedas:** cada quiz paga, somando as perguntas, o preço do mascote dele. Cada pergunta paga uma
  vez, no primeiro acerto; as erradas continuam valendo nos próximos quizzes. Acertando tudo, as
  moedas dão exatamente para adotar todos os mascotes, e o saldo termina em zero.
- **Adoção:** carrinho e checkout pagos com moedas, um mascote de cada. Nada é vendido nem cobrado:
  as moedas não valem dinheiro.
- **Sem login:** carteira e pedidos são identificados por códigos UUID guardados no navegador.

## Arquitetura

Monorepo com npm workspaces, Node 22 e TypeScript em tudo.

```
apps/
  api/   Fastify + Knex + PostgreSQL, monólito modular
  web/   React + Vite, servido por nginx em produção
docs/    contrato OpenAPI e registro de uso de IA
```

A API é dividida em módulos com fronteiras explícitas: cada um é dono das próprias tabelas e só é
usado por outro pelo seu `index.ts`.

| Módulo     | Responsabilidade                                   | Depende de            |
| ---------- | -------------------------------------------------- | --------------------- |
| `catalog`  | Mascotes, preços, estoque e ilustrações            | —                     |
| `wallets`  | Carteiras, saldo e extrato de moedas               | —                     |
| `quizzes`  | Perguntas, tentativas, correção e prêmio em moedas | `wallets`, `catalog`  |
| `payments` | Pagamento com moedas (padrão Strategy)             | `wallets`             |
| `orders`   | Pedidos com idempotência e baixa de estoque        | `catalog`, `payments` |

Decisões que valem destacar:

- Pedido e carteira com ID UUID, nunca sequencial, para que ninguém adivinhe o código de outra
  pessoa (IDOR).
- `POST /orders` exige `Idempotency-Key`: clique duplo ou nova tentativa da rede devolvem o mesmo
  pedido.
- Pagamento numa transação só: trava o pedido (`FOR UPDATE`), baixa o estoque, debita as moedas e
  marca como pago. O banco aceita um único pagamento aprovado por pedido.
- Moedas nunca ficam negativas (`UPDATE` condicional) e não são creditadas em dobro (referência
  única no extrato), mesmo com requisições simultâneas.

## Como rodar

Pré-requisitos: Docker com Docker Compose. Para desenvolver fora do Docker, também Node 22
(veja `.nvmrc`).

### Tudo no Docker

```bash
cp .env.example .env      # valores de exemplo, prontos para uso local
docker compose up --build
```

| Serviço | Endereço                         |
| ------- | -------------------------------- |
| Site    | http://localhost:8080            |
| API     | http://localhost:3333            |
| Swagger | http://localhost:3333/docs       |
| Banco   | `127.0.0.1:5432` (só localmente) |

`docker compose ps` mostra os três serviços como `healthy`. As migrations rodam sozinhas quando a
API sobe. Para apagar os dados locais: `docker compose down -v`.

### Desenvolvimento com recarga automática

No Docker, sem instalar Node na máquina:

```bash
npm run dev:docker        # ou: docker compose -f compose.dev.yaml up
```

O código é montado nos containers: ao salvar, a API reinicia sozinha e o site atualiza no
navegador. Site em http://localhost:5173 e API em http://localhost:3333. Use um ambiente de cada
vez (`docker compose stop` antes), porque os dois usam as mesmas portas.

Ou direto na máquina, com Node 22:

```bash
npm install                      # também ativa os hooks de commit
docker compose up -d db          # só o banco
npm run dev -w @devland/api      # API com recarga automática, porta 3333
npm run dev -w @devland/web      # site com Vite, porta 5173
```

## Testes

```bash
npm test                                  # API e site
npm run test:coverage -w @devland/api     # com relatório de cobertura
```

Cada regra é testada no caminho feliz, nos caminhos tristes e nos casos de borda.

- **API (121 testes):** unitários das regras de negócio e de integração com um PostgreSQL de
  verdade, descartável, criado pelo Testcontainers (precisa do Docker). Cobrem os limites de cada
  campo, os erros de cada rota, a concorrência no banco e as migrations subindo e descendo, inclusive
  com dados do formato antigo.
- **Site (91 testes):** jornadas completas pela interface contra um backend falso com as mesmas
  regras da API, mais o cliente da API, o sanitizador do SVG, o carrinho, a carteira e o modal.

Estratégia, cobertura e o que ficou de fora de propósito: [`docs/testes.md`](docs/testes.md).

## Variáveis de ambiente

Ficam no `.env` (fora do git). O `.env.example` traz valores fictícios para uso local.

| Variável            | Onde      | Para quê                                                                    |
| ------------------- | --------- | --------------------------------------------------------------------------- |
| `NODE_ENV`          | API       | `development`, `test` ou `production`                                       |
| `PORT`              | API       | Porta da API (padrão 3333)                                                  |
| `DATABASE_URL`      | API       | Conexão `postgres://` com o banco                                           |
| `CORS_ORIGIN`       | API       | Origens do site autorizadas, separadas por vírgula; obrigatória em produção |
| `POSTGRES_USER`     | compose   | Usuário do banco local                                                      |
| `POSTGRES_PASSWORD` | compose   | Senha do banco local                                                        |
| `POSTGRES_DB`       | compose   | Nome do banco local                                                         |
| `DB_PORT`           | compose   | Porta do banco no host (padrão 5432)                                        |
| `API_PORT`          | compose   | Porta da API no host (padrão 3333)                                          |
| `WEB_PORT`          | compose   | Porta do site no host (padrão 8080)                                         |
| `VITE_API_URL`      | web/build | Endereço da API usado pelo site. Vai para o navegador: é público            |

## Contrato da API

O contrato OpenAPI 3.1 é gerado dos schemas das rotas e fica versionado em
[`docs/openapi.yaml`](docs/openapi.yaml). Mudou uma rota? `npm run openapi -w @devland/api`
atualiza o arquivo, e o CI falha se o versionado estiver desatualizado. `npm run lint:openapi`
valida o contrato com o Redocly.

## Qualidade e CI

Cada pull request passa por:

- lint, formatação e build;
- testes da API e do site, com limite de cobertura;
- auditoria de dependências (`npm audit`);
- conferência e lint do contrato OpenAPI;
- busca de segredos com o gitleaks;
- varredura das imagens Docker com o Trivy, que reprova vulnerabilidades altas e críticas.

As imagens rodam sem root e são publicadas no Docker Hub:
[`flaviare1s/devland-api`](https://hub.docker.com/r/flaviare1s/devland-api) e
[`flaviare1s/devland-web`](https://hub.docker.com/r/flaviare1s/devland-web). Push na `main`
publica `latest` e `sha-<commit>`; uma tag `vX.Y.Z` publica `X.Y.Z` e `X.Y`.

Localmente, os hooks rodam o gitleaks e o lint-staged antes de cada commit, e o commitlint confere
a mensagem.

## Fluxo de contribuição

- Toda mudança nasce numa branch a partir da `develop`: `feat/...`, `fix/...`, `docs/...`,
  `chore/...`, `ci/...`, `test/...`.
- Commits em [Conventional Commits](https://www.conventionalcommits.org/pt-br/), pequenos e focados.
- A branch entra na `develop` por pull request, com merge commit (sem squash).
- Release: pull request `develop → main` com título `chore(release): vX.Y.Z`, seguido da tag e da
  release no GitHub.

## Uso de IA

O desenvolvimento contou com assistente de IA, declarado em [`docs/ia.md`](docs/ia.md).
