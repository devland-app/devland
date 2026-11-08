# 0001. Monólito modular com fronteiras explícitas

- Status: aceita
- Data: 2026-11-05

## Contexto

O DevLand tem catálogo, carteiras, quizzes, pagamentos e pedidos. As regras se cruzam: pagar um
pedido baixa o estoque do catálogo, debita moedas da carteira e marca o pedido como pago, tudo de
uma vez. Uma pessoa desenvolve, o prazo é curto e o deploy precisa ser gratuito.

## Decisão

Uma API só (um deploy), dividida em módulos em `apps/api/src/modules/`: `catalog`, `wallets`,
`quizzes`, `payments` e `orders`.

- Cada módulo é dono das próprias tabelas; nenhum lê ou grava tabela de outro.
- Um módulo só usa outro pelo `index.ts` dele, e recebe a dependência como interface na
  composição (`app.ts`), nunca a classe concreta.
- As dependências formam um grafo sem ciclos: `orders → catalog`, `orders → payments`,
  `payments → wallets`, `quizzes → wallets`, `quizzes → catalog`. `catalog` e `wallets` não
  dependem de ninguém.
- Dentro do módulo: rotas (HTTP e schema) → service (regra) → repository (interface e
  implementação).

## Alternativas consideradas

- **Microsserviços (descartada).** Cada módulo seria um serviço com deploy e banco próprios. O
  pagamento, que hoje é uma transação, viraria uma transação distribuída (saga) entre três serviços.
  Seriam cinco deploys, comunicação pela rede e mais pontos de falha, sem ganho para o tamanho do
  sistema e com custo fora do plano gratuito.
- **Monólito em camadas, sem módulos (descartada).** Mais simples no começo, mas as fronteiras
  ficariam implícitas: qualquer service poderia consultar qualquer tabela, e separar uma parte
  depois exigiria reescrever.

## Consequências

- O pagamento roda numa transação só, com consistência forte e testada com concorrência real.
- Os services são testados com dublês em memória, sem banco, porque dependem de interfaces.
- Um módulo pode virar serviço depois: a fronteira (interface e `index.ts`) já existe.
- A regra de importação entre módulos depende de revisão. Um próximo passo seria uma regra de lint
  que proíba importar arquivos internos de outro módulo.
