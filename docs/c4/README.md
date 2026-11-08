# Arquitetura em C4

Três níveis do [modelo C4](https://c4model.com/): o sistema no mundo (contexto), as peças que
rodam (contêineres) e os módulos da API (componentes). As decisões por trás de cada escolha estão
nos [ADRs](../adr/README.md).

## Nível 1: contexto

Quem usa o DevLand e com quais sistemas ele conversa.

```mermaid
flowchart TB
    visitante["<b>Estudante</b><br/>[Pessoa]<br/>Responde quizzes, ganha moedas<br/>e adota mascotes"]
    dev["<b>Pessoa desenvolvedora</b><br/>[Pessoa]<br/>Escreve o código e abre<br/>pull requests"]

    devland["<b>DevLand</b><br/>[Sistema]<br/>Site educativo de DevOps: quizzes,<br/>carteira de moedas e coleção de mascotes"]

    github["<b>GitHub</b><br/>[Sistema externo]<br/>Código, pull requests e CI<br/>(GitHub Actions)"]
    dockerhub["<b>Docker Hub</b><br/>[Sistema externo]<br/>Imagens da API e do site<br/>(x64 e ARM)"]
    vercel["<b>Vercel</b><br/>[Sistema externo]<br/>CDN do site e função da API"]
    neon["<b>Neon</b><br/>[Sistema externo]<br/>PostgreSQL gerenciado"]

    visitante -- "Usa pelo navegador<br/>[HTTPS]" --> devland
    dev -- "Envia código<br/>[git]" --> github
    github -- "Publica imagens" --> dockerhub
    github -- "Faz o deploy<br/>[Vercel CLI]" --> vercel
    github -- "Aplica migrations" --> neon
    devland -- "Roda em" --> vercel
    devland -- "Guarda dados em<br/>[SQL/TLS]" --> neon

    classDef person fill:#08427b,stroke:#052e56,color:#fff
    classDef system fill:#1168bd,stroke:#0b4884,color:#fff
    classDef external fill:#999,stroke:#6b6b6b,color:#fff
    class visitante,dev person
    class devland system
    class github,dockerhub,vercel,neon external
```

Não há login nem cadastro: a carteira e os pedidos são identificados por UUID, guardados no
navegador. O sistema não pede nenhum dado pessoal nem de pagamento.

## Nível 2: contêineres

As peças que rodam e como conversam em produção, onde site e API ficam no mesmo domínio (`/api`),
sem CORS. Com `docker compose up`, as mesmas peças rodam em contêineres: o nginx entrega o site
(porta 8080) e o site chama a API direto (porta 3333), com CORS restrito à origem do site.

```mermaid
flowchart TB
    visitante["<b>Estudante</b><br/>[Pessoa]"]

    subgraph devland["DevLand"]
        direction TB
        spa["<b>Site</b><br/>[Contêiner: React 19 + Vite]<br/>Vitrine, quizzes, carrinho e coleção.<br/>Guarda os códigos da carteira e dos<br/>pedidos no localStorage"]
        api["<b>API</b><br/>[Contêiner: Node 22 + Fastify 5]<br/>Regras de quizzes, moedas, pedidos<br/>e pagamento. Contrato OpenAPI em /docs"]
        db[("<b>Banco de dados</b><br/>[Contêiner: PostgreSQL 17]<br/>Catálogo, carteiras e extrato,<br/>tentativas, pedidos e pagamentos")]
        cdn["<b>CDN</b><br/>[Vercel Edge Network]<br/>Entrega o site e guarda em cache<br/>o catálogo e as ilustrações"]
    end

    visitante -- "Abre o site<br/>[HTTPS]" --> cdn
    cdn -- "Entrega HTML, JS e CSS" --> spa
    spa -- "Chama /api<br/>[JSON/HTTPS]" --> cdn
    cdn -- "Repassa o que não<br/>está em cache" --> api
    api -- "Lê e grava<br/>[SQL via Knex, pooler]" --> db

    classDef person fill:#08427b,stroke:#052e56,color:#fff
    classDef container fill:#438dd5,stroke:#2e6295,color:#fff
    class visitante person
    class spa,api,db,cdn container
```

| Contêiner | Produção                               | Docker Compose                             |
| --------- | -------------------------------------- | ------------------------------------------ |
| Site      | Arquivos estáticos na CDN da Vercel    | `devland-web` (nginx sem root, porta 8080) |
| API       | Função da Vercel em São Paulo (`gru1`) | `devland-api` (Node sem root, porta 3333)  |
| Banco     | Neon em São Paulo (`aws-sa-east-1`)    | `postgres:17-alpine` com volume            |

## Nível 3: componentes da API

O monólito modular por dentro. Cada módulo é dono das próprias tabelas e só usa outro pela
interface exportada no `index.ts`. A composição (`app.ts`) liga as dependências.

```mermaid
flowchart LR
    http["<b>Fastify</b><br/>Rotas, validação por JSON Schema,<br/>erros padronizados, Swagger"]

    subgraph modulos["Módulos (apps/api/src/modules)"]
        catalog["<b>catalog</b><br/>Mascotes, preços em moedas,<br/>estoque e lições"]
        wallets["<b>wallets</b><br/>Saldo e extrato.<br/>Crédito e débito idempotentes"]
        quizzes["<b>quizzes</b><br/>Sorteia perguntas, corrige<br/>e paga no primeiro acerto"]
        payments["<b>payments</b><br/>PaymentGateway (Strategy)<br/>CoinsPaymentGateway"]
        orders["<b>orders</b><br/>Pedidos com Idempotency-Key,<br/>pagamento numa transação"]
    end

    db[("PostgreSQL")]

    http --> catalog & wallets & quizzes & orders
    quizzes -- "preço do mascote" --> catalog
    quizzes -- "credita moedas" --> wallets
    orders -- "nome, preço e estoque" --> catalog
    orders -- "paga o pedido" --> payments
    payments -- "debita moedas" --> wallets
    catalog & wallets & quizzes & payments & orders -.-> db

    classDef component fill:#85bbf0,stroke:#5d82a8,color:#000
    class catalog,wallets,quizzes,payments,orders,http component
```

Dentro de cada módulo, as camadas seguem a mesma direção: `routes` (HTTP e schema) → `service`
(regra de negócio) → `repository` (interface e implementação com Knex). O service depende só da
interface do repository, por isso é testado sem banco.
