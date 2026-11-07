# Testes

Os testes cobrem as regras que, se quebrarem, fazem o DevLand dar errado sem ninguém perceber:
moedas creditadas em dobro, pagamento cobrado duas vezes, gabarito vazando, SVG injetando script.
Todos rodam com `npm test` e no CI a cada pull request. Imagem Docker só é construída depois que
eles passam.

## Como rodar

```bash
npm test                                  # API e site
npm run test:coverage -w @devland/api     # API com relatório de cobertura
npm run test:coverage -w @devland/web     # site com relatório de cobertura
npm run test:unit -w @devland/api         # só os unitários da API (não precisa de Docker)
```

Os testes de integração da API precisam do Docker: cada arquivo sobe um PostgreSQL descartável com
o [Testcontainers](https://testcontainers.com/). Não dependem do banco de desenvolvimento nem de
nenhuma configuração.

## O que é testado

### API: unitários (`apps/api/test/unit`)

Os services recebem as dependências por interface, então os testes usam implementações em memória
que imitam as garantias do banco (chave única, saldo que não fica negativo). Rodam em milissegundos.

- **Quizzes:** a divisão do preço entre as perguntas soma exatamente o total; a pergunta sai sem
  gabarito; cada pergunta paga uma vez por carteira; errar não paga, mas a pergunta continua
  valendo; acertar tudo dá a soma exata dos preços.
- **Banco de perguntas:** 8 quizzes com 5 perguntas de 3 opções, chaves únicas e ids de opção que
  não revelam a resposta.
- **Carteiras e pagamento com moedas:** crédito uma vez por referência, débito recusado com "faltam
  N moedas", carteira inexistente com mensagem clara.
- **Pedidos:** preço sempre do catálogo, idempotência (inclusive a corrida de duas requisições com a
  mesma chave), um mascote de cada, pagamento aprovado dentro da transação, recusa gravada fora
  dela, pagamento repetido sem nova cobrança.
- **Configuração:** variáveis obrigatórias, `CORS_ORIGIN` exigida em produção, mensagens de erro que
  nunca mostram o valor (pode ser um segredo).

### API: integração (`apps/api/test/integration`)

A aplicação inteira (`buildApp`) com um PostgreSQL de verdade, via `app.inject()`, sem abrir porta.

- **Migrations:** sobem, descem todas e sobem de novo. É o que garante que um rollback de versão
  consegue desfazer o banco.
- **Fluxos HTTP:** saúde, catálogo, carteiras, quizzes, pedidos e pagamento, com os códigos de status
  de cada erro (400, 402, 404, 409 e 422).
- **Concorrência de verdade, no banco:** duas respostas certas simultâneas à mesma pergunta pagam
  uma vez; dois cliques com a mesma `Idempotency-Key` criam um pedido; dois pagamentos disputando as
  mesmas moedas, só um passa.
- **Economia fechada:** acertar todas as perguntas e adotar todos os mascotes deixa o saldo em zero.
- **Segurança:** CORS só para a origem do site, ilustração servida com `nosniff` e CSP, e erro do
  banco sem detalhes vazando para o cliente.

### Site (`apps/web/src/**/*.test.ts(x)`)

Vitest com jsdom e Testing Library, testando pelo que a pessoa vê e clica.

- **Sanitização do SVG inline:** remove scripts, `foreignObject`, atributos de evento e links
  externos; prefixa os ids. É o ponto do site em que um conteúdo vindo da API vira HTML.
- **`localStorage`:** valor quebrado, antigo ou armazenamento bloqueado não derrubam a página.
- **Carteira:** criada só no primeiro uso e uma vez só, mesmo com dois usos simultâneos; esquecida
  quando o banco foi recriado.
- **Quiz:** a tela corrige, explica, marca certa e errada e mostra quanto ainda falta ganhar, com a
  API simulada.

## Cobertura

| App  | Limite                                             | Por quê                                                                          |
| ---- | -------------------------------------------------- | -------------------------------------------------------------------------------- |
| API  | 85% das linhas, 75% dos ramos                      | É onde ficam as regras de negócio; tudo ali é testável sem esforço artificial    |
| Site | Por arquivo: sanitizador, storage, carteira e quiz | Componentes só visuais não têm regra; testar a marcação deles só repetiria o JSX |

O CI publica a tabela de cobertura no resumo de cada execução e guarda o relatório HTML como
artefato por 14 dias.

## O que ficou de fora, e por quê

- **Testes de ponta a ponta no navegador (Playwright):** os fluxos de negócio já são testados de
  ponta a ponta na API, com banco de verdade, e a tela do quiz é testada com a API simulada. Um teste
  com navegador repetiria os mesmos caminhos e somaria minutos a cada pull request. Durante o
  desenvolvimento, as telas foram conferidas com o Chrome headless em tamanhos de desktop e celular.
- **Testes de regressão visual:** o visual muda com frequência nesta fase. Capturas de referência
  quebrariam a cada ajuste de cor ou espaçamento, sem apontar defeito real.
- **Teste de mutação:** útil para medir a força da suíte, mas caro de rodar no CI para o tamanho
  do projeto.
