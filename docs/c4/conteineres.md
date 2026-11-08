# Contêineres (C4, nível 2)

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
