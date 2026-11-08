# 0002. Acesso a dados com Knex, Repository e migrations como código

- Status: aceita
- Data: 2026-11-06

## Contexto

As regras mais importantes dependem de SQL explícito:

- `SELECT ... FOR UPDATE` para travar o pedido durante o pagamento;
- `UPDATE` condicional para o saldo de moedas nunca ficar negativo;
- `INSERT ... ON CONFLICT DO NOTHING` para não creditar a mesma pergunta duas vezes;
- índices únicos (inclusive parcial) como última barreira contra duplicidade.

A API roda tanto em container quanto como função serverless, onde o tamanho do pacote e o tempo de
subida contam.

## Decisão

- **Knex** como construtor de consultas e executor de migrations. As consultas são parametrizadas
  (nada de SQL montado com texto do usuário).
- **Repository:** cada módulo declara a interface do que precisa (`ProductRepository`,
  `WalletRepository`...) e tem uma implementação com Knex. O service depende só da interface.
- **Unit of Work:** quem coordena um caso de uso abre a transação (`TransactionRunner`) e a repassa
  aos repositories.
- **Migrations como objetos TypeScript**, com `up` e `down`, numa lista única em ordem de criação
  (`src/migrations.ts`). Funcionam igual com `tsx` e com o JavaScript compilado.

## Alternativas consideradas

- **Prisma (descartada).** A trava de linha (`FOR UPDATE`), central no pagamento, não existe na
  API dele e exigiria SQL cru do mesmo jeito. O schema próprio (`schema.prisma`) e o client gerado
  acrescentariam um passo de geração ao build, ao CI e à função serverless.
- **TypeORM (descartada).** Entidades com decorators acoplam o domínio ao ORM, e o padrão Active
  Record mistura regra e acesso a dados, o contrário do que o monólito modular pede.
- **Driver `pg` puro (descartada).** Sem migrations nem construtor de consultas, tudo seria
  escrito à mão, com mais chance de erro na montagem de SQL.

## Consequências

- O SQL de cada regra é visível e revisável no repository do módulo.
- Os services são testáveis sem banco; os repositories, com PostgreSQL real (Testcontainers).
- Toda migration tem `down`, testado: os testes sobem, descem e sobem de novo, inclusive com dados
  do formato antigo. Foi esse teste que mostrou que a lista precisava seguir a ordem de criação.
