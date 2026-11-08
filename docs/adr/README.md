# Decisões de arquitetura (ADR)

Cada decisão importante, com o contexto, a escolha, as alternativas descartadas e as
consequências. Formato inspirado no [MADR](https://adr.github.io/madr/).

| ADR                                            | Decisão                                                                      |
| ---------------------------------------------- | ---------------------------------------------------------------------------- |
| [0001](0001-monolito-modular.md)               | Monólito modular com fronteiras explícitas, em vez de microsserviços         |
| [0002](0002-acesso-a-dados-knex-repository.md) | Knex, Repository e migrations como código, em vez de Prisma ou TypeORM       |
| [0003](0003-pagamento-transacao-sem-fila.md)   | Pagamento com Strategy, transação única e idempotência, sem fila             |
| [0004](0004-deploy-vercel-neon-terraform.md)   | Deploy gratuito na Vercel e no Neon, com Terraform, e a estratégia de deploy |
