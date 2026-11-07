---
name: modularity
description: Como organizar o monólito modular da API do DevLand (catalog, orders, payments) e o front, com fronteiras explícitas, SOLID e dependências apontando para dentro. Use ao criar módulos, arquivos, endpoints ou ao decidir onde um código deve morar.
---

# Modularidade no DevLand

O enunciado do Projeto A exige **monólito modular com fronteiras explícitas**. Um deploy só, mas
módulos que poderiam virar serviços separados sem reescrever o domínio.

## Estrutura da API

```
apps/api/src/
  app.ts                 monta o Fastify e registra os módulos
  server.ts              só sobe o servidor
  shared/                infraestrutura comum (config, logger, db, erros); sem regra de negócio
  modules/
    catalog/
      index.ts           API pública do módulo (a única coisa que outros módulos importam)
      catalog.routes.ts  HTTP: valida entrada, chama o service, formata saída
      catalog.service.ts regra de negócio
      catalog.repository.ts acesso a dados (interface + implementação)
      catalog.types.ts
    orders/
    payments/
```

## Regras de fronteira

1. **Um módulo só importa outro pelo `index.ts`.** Nada de `../catalog/catalog.repository`.
2. **Cada módulo é dono das suas tabelas.** `orders` não faz JOIN nem escreve nas tabelas de
   `catalog`; pede ao `catalog` pela interface pública (ex.: `getProductPrices(ids)`).
3. **Sem dependência circular.** Fluxo permitido: `orders → catalog`, `orders → payments`.
   `catalog` não conhece ninguém.
4. **Comunicação assíncrona por eventos/fila** quando um módulo só precisa reagir (ex.: pagamento
   aprovado atualiza o pedido via job do BullMQ), com handlers idempotentes.
5. `shared/` não importa nada de `modules/`.

Se possível, garanta as regras com lint (`no-restricted-imports` ou `eslint-plugin-boundaries`)
para que a fronteira não dependa só de disciplina.

## Camadas e SOLID

- **Routes** só conhecem o service. **Service** depende de interfaces (`ProductRepository`,
  `PaymentGateway`), não de Prisma ou de HTTP. **Repository** implementa a interface.
- Inversão de dependência: as implementações são injetadas no `index.ts` do módulo. Nos testes
  unitários, injete fakes.
- `PaymentGateway` com implementação fake é o exemplo natural de **Strategy** para o ADR.
- Uma responsabilidade por arquivo; arquivo passando de ~300 linhas é sinal para dividir.

## Front (apps/web)

```
apps/web/src/
  features/catalog, features/cart, features/checkout   componentes + hooks por funcionalidade
  shared/ui        componentes visuais reutilizáveis (Button, Card)
  shared/api       cliente HTTP (único lugar que chama fetch)
```

Features não importam arquivos internos umas das outras; o compartilhado vai para `shared/`.

## Antes de criar algo, pergunte

- A qual módulo isso pertence? Se a resposta for "dois", provavelmente falta uma interface.
- Outro módulo vai precisar disso? Então exponha pelo `index.ts`, com nome claro.
- Dá para testar o service sem banco e sem HTTP? Se não, a dependência está apontando para o lado errado.
