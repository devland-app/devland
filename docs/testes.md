# Testes

Os testes cobrem, para cada regra, o caminho feliz, os caminhos tristes e os casos de borda. São o
que impede o DevLand de dar errado sem ninguém perceber: moedas creditadas em dobro, pagamento
cobrado duas vezes, gabarito vazando, SVG injetando script, rollback de versão apagando dados.
Todos rodam com `npm test` e no CI a cada pull request. Imagem Docker só é construída depois que
eles passam.

| App  | Testes | Linhas | Ramos | Limite no CI (linhas / ramos) |
| ---- | -----: | -----: | ----: | ----------------------------- |
| API  |    180 |  96,9% |   86% | 90% / 80%                     |
| Site |    112 |  98,9% | 91,9% | 90% / 85%                     |

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

## O que cada tipo de caso cobre

| Caso           | API                                                                                                                                                                              | Site                                                                                                                                 |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Caminho feliz  | Quiz até o fim, adoção paga, economia fechada (acertar tudo e adotar todos deixa o saldo em zero), consulta de pedido e carteira                                                 | Jornada completa: adotar, ficar sem saldo, ganhar moedas no quiz, pagar o pedido pendente, ver a coleção e o mascote                 |
| Caminho triste | Saldo insuficiente (402 com "faltam N moedas"), carteira, pedido, quiz e tentativa inexistentes, mascote esgotado na hora de pagar (409), banco fora do ar (503 e erro genérico) | Erro da API ao carregar a vitrine, a lista de quizzes e o quiz, ao criar o pedido e ao pagar, sempre com mensagem e "tentar de novo" |
| Casos de borda | Limites de cada campo (ids, quantidade, Idempotency-Key de 7 a 101 caracteres, 0 a 21 itens), formatos inválidos, campos a mais, caminho para fora da pasta das imagens          | Carrinho e carteira salvos em formato antigo ou inválido, armazenamento bloqueado, carteira que sumiu do banco, SVG malicioso        |
| Repetições     | Mesma chave com outro conteúdo devolve o pedido original; pagar de novo devolve o mesmo recibo; resposta repetida é 409; acerto repetido não paga                                | Dois usos simultâneos da carteira criam uma só; mascote adotado ou pendente não volta ao carrinho                                    |
| Concorrência   | Respostas, pedidos e pagamentos simultâneos no banco de verdade: só um passa                                                                                                     | —                                                                                                                                    |

## API

### Unitários (`apps/api/test/unit`, 104 testes)

Os services recebem as dependências por interface, então os testes usam implementações em memória
que imitam as garantias do banco (chave única, saldo que não fica negativo). Rodam em milissegundos.
Cobrem quizzes (divisão do preço, gabarito escondido, pagamento único por pergunta, quiz com menos
de 5 perguntas, conteúdo inválido), carteiras e o pagamento com moedas, pedidos, catálogo (baixa de
estoque em ordem de id, para evitar deadlock), a configuração por variáveis de ambiente, a entrada
da Vercel (prefixo `/api` e o parâmetro que a regra de redirecionamento acrescenta), a documentação
da API atrás desse prefixo e os desenhos dos mascotes: cada um precisa de lição e quiz com o mesmo
slug, olhos que piscam, uma parte que se mexe na vitrine e nenhum script.

### Integração (`apps/api/test/integration`, 76 testes)

A aplicação inteira (`buildApp`) com um PostgreSQL de verdade, via `app.inject()`, sem abrir porta.

- `api.test.ts`: os caminhos felizes e a concorrência real.
- `edge-cases.test.ts`: os caminhos tristes e os casos de borda de cada rota.
- `migrations.test.ts`: todas as migrations sobem, descem e sobem de novo.
- `data-migrations.test.ts`: um banco com dados do formato antigo (centavos, Pix, textos com o nome
  DevZoo) é convertido para o novo, e a conversão é desfeita migration por migration.
- `contract.test.ts`: o lado da API do teste de contrato (próxima seção).

## Contrato da API

O `docs/openapi.yaml` versionado é o contrato, e os dois lados são testados contra ele:

- **API** (`apps/api/test/integration/contract.test.ts`, 8 testes): chama cada rota com um
  PostgreSQL de verdade e valida a resposta contra o schema daquele status. O último teste exige que
  todas as combinações de rota e status declaradas tenham sido exercitadas: um status novo no
  contrato reprova até ganhar um caso, e uma resposta com status não declarado também reprova.
- **Site** (`apps/web/src/test/contract.test.ts`, 11 testes): confere o que o cliente envia (rota,
  método, parâmetros e corpo de cada função de `shared/api/client.ts`) e o que ele espera receber
  (o dublê usado nas jornadas tem de devolver o que a API promete).

Se a API mudar, o CI obriga a regenerar o contrato, e o site reprova antes de quebrar em produção.
Para confirmar que os testes têm efeito, o contrato foi alterado de propósito em três pontos (campo
obrigatório novo, status removido e rota renomeada): a API reprovou nos três, e o site nos dois que
o afetam. O teste do site também achou uma divergência real: o dublê devolvia um id de pagamento que
não era UUID.

## Site (`apps/web/src/**/*.test.ts(x)`, 112 testes)

Vitest com jsdom e Testing Library, testando pelo que a pessoa vê e clica (papéis e nomes
acessíveis, nunca classes de CSS como critério principal).

- **Jornadas (`App.test.tsx`):** o `App` inteiro contra um backend falso em memória
  (`src/test/fakeApi.ts`) com as mesmas regras da API: estoque, saldo, idempotência e pagamento
  único por pergunta.
- **Unidades:** cliente da API (cada tipo de falha vira uma mensagem), rotas por hash, coleção e
  carrinho derivados dos pedidos, modal (Esc, clique fora, animação de saída, movimento reduzido),
  desenho do mascote (reserva quando o SVG falha, ids únicos, piscadas e animações da vitrine, que
  param com movimento reduzido), sanitizador do SVG, sons (com um dublê da Web Audio API), som dos
  links com cara de botão, feature flags, confete e tema.

## Bug encontrado pelos testes

O teste que desfaz as migrations uma a uma mostrou que o Knex segue a ordem da lista do código, e
não a ordem em que elas foram aplicadas. Como a lista era agrupada por módulo, um `migrate.down`
desfaria `payments_001` (apagando a tabela de pagamentos) antes de `catalog_008` e `orders_002`.
Num rollback de versão em produção, isso perderia dados. A correção foi ordenar a lista pela data de
criação (`apps/api/src/migrations.ts`), com uma checagem que impede a API de subir se alguma
migration ficar de fora.

## O que ficou de fora, e por quê

- **Pact:** ele resolve o problema de times e repositórios separados, que publicam contratos num
  broker e implantam em momentos diferentes. Aqui site e API estão no mesmo repositório, são
  publicados juntos e já têm um contrato único, conferido no CI. O Pact criaria um segundo contrato
  para manter em dia e um binário nativo no CI, sem pegar nenhum erro a mais.
- **Testes de ponta a ponta num navegador real (Playwright):** os fluxos já são testados de ponta a
  ponta na API, com banco de verdade, e as jornadas da tela rodam contra um backend falso com as
  mesmas regras. Um navegador real repetiria esses caminhos e somaria minutos a cada pull request.
  Durante o desenvolvimento, as telas foram conferidas com o Chrome headless no desktop e no
  celular.
- **Regressão visual:** o visual muda com frequência nesta fase. Capturas de referência quebrariam a
  cada ajuste de cor ou espaçamento, sem apontar defeito real.
- **Teste de mutação:** útil para medir a força da suíte, mas caro de rodar no CI para o tamanho
  do projeto.
