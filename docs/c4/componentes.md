# Componentes da API (C4, nível 3)

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
