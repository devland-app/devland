# 0003. Pagamento com moedas: Strategy, transação única e idempotência, sem fila

- Status: aceita
- Data: 2026-11-07

## Contexto

Pagar um pedido mexe em três módulos: baixa o estoque (`catalog`), debita as moedas (`wallets`) e
marca o pedido como pago (`orders`). Não pode existir estado intermediário (moedas debitadas e
pedido pendente, por exemplo). A pessoa pode clicar duas vezes, a rede pode repetir a requisição e
duas compras podem disputar as mesmas moedas.

## Decisão

- **Strategy:** o módulo de pagamentos depende da interface `PaymentGateway`. A implementação
  `CoinsPaymentGateway` debita a carteira. Trocar a forma de pagamento é trocar uma linha na
  composição do módulo.
- **Transação única:** trava o pedido (`FOR UPDATE`), baixa o estoque em ordem crescente de id
  (sem deadlock), debita as moedas com `UPDATE` condicional e marca como pago. Uma recusa desfaz
  tudo e é gravada fora da transação, para ficar no histórico.
- **Idempotência no banco:** `Idempotency-Key` única por pedido; extrato com referência única por
  movimento; um único pagamento aprovado por pedido (índice parcial único). Repetir devolve o mesmo
  resultado, sem cobrar de novo.

## Alternativas consideradas

- **Fila (BullMQ com Redis, ou RabbitMQ) para processar pagamentos (descartada).** O plano de p95
  do enunciado sugere fila com idempotência. Aqui nada é assíncrono: o pagamento é local e leva
  milissegundos, e a pessoa precisa da resposta na hora. Uma fila exigiria um broker e um worker
  sempre ligados (sem plano gratuito que não durma, e um worker não roda numa função serverless), e
  o cliente esperaria o resultado do mesmo jeito. A idempotência que uma fila exigiria já está na
  chave e nos índices únicos.
- **Saldo de moedas no navegador (descartada).** Qualquer pessoa editaria o saldo pelo DevTools.

## Consequências

- Consistência forte, testada com requisições simultâneas contra PostgreSQL real.
- Se um dia houver um gateway externo (com confirmação por webhook), aí entram fila e outbox: o
  pagamento passaria a esperar um sistema de fora.
