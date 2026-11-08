# Uso de IA

Ferramenta: Claude Code (Anthropic), guiado pelo `CLAUDE.md` e pelas skills em `.claude/`. A IA
escreveu a maior parte do código, dos testes e da documentação e executou os commits a meu pedido.
Os requisitos, as ideias, as escolhas entre alternativas, a conferência do resultado e os merges são
meus.

| Data  | Prompt (resumo)                                                                                                                                      | Resultado                                                                                                                                                                                                                        | O que decidi                                                                                               |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| 05/11 | Ler o enunciado do projeto final e sugerir tecnologias gratuitas, sem cartão de crédito                                                              | Mapeamento dos requisitos do nível A para ferramentas gratuitas                                                                                                                                                                  | Nível A, Render para a API, Netlify para o front, Neon para o banco                                        |
| 05/11 | Ideia de marketplace fofo de miniaturas de tecnologia                                                                                                | Tema DevLand com mascotes originais (não usar marcas registradas)                                                                                                                                                                | Adotado o tema DevLand                                                                                     |
| 05/11 | Criar monorepo com npm workspaces, lint, commits semânticos                                                                                          | Estrutura `apps/api` e `apps/web`, ESLint, Prettier, husky, commitlint                                                                                                                                                           | Revisado e commitado por mim em commits pequenos                                                           |
| 05/11 | Docker, imagens no Docker Hub a cada atualização, segredos no GitHub Secrets                                                                         | Dockerfiles multi-stage, compose, workflow de CI com gitleaks e Trivy                                                                                                                                                            | Revisado e testado localmente antes de subir                                                               |
| 05/11 | Pasta `.claude` com CLAUDE.md e skills de acessibilidade, segurança e modularidade                                                                   | Contexto do projeto e checklists                                                                                                                                                                                                 | Adotado                                                                                                    |
| 07/11 | Testes cobrindo caminhos felizes, tristes e casos de borda, com cobertura no CI (prompt completo abaixo)                                             | 121 testes na API (unitários e de integração com PostgreSQL real) e 91 no site; os testes de borda acharam um bug na ordem das migrations                                                                                        | Revisado; limites de cobertura no pipeline e o que ficou de fora registrado em `docs/testes.md`            |
| 07/11 | Trocar a compra simulada por quizzes que rendem moedas: acertar tudo paga exatamente todos os mascotes, e cada pergunta paga uma vez                 | Módulos `wallets` e `quizzes`, extrato com referência única e divisão do preço do mascote entre as perguntas                                                                                                                     | A ideia e as regras são minhas, inclusive a de que a pergunta errada continua valendo nos próximos quizzes |
| 07/11 | "não precisa forçar a barra colocando todas as especificações que o projeto pede, se não for pertinente, não use, mas documente o porquê da escolha" | ADRs com as alternativas descartadas; sem microsserviços e sem fila, com o motivo registrado                                                                                                                                     | Defini esse critério e exigi Terraform e um deploy gratuito que não demorasse a carregar                   |
| 07/11 | "quero gratuito, vercel aceita fastify? [...] pode usar um back que dorme, mas use mais rápido possível [...] front use um que não dorme"            | Comparação de plataformas; site na CDN da Vercel, API como função em São Paulo, PostgreSQL no Neon, tudo em Terraform                                                                                                            | Descartei o Supabase (sem projeto gratuito disponível), criei as contas e gravei os segredos               |
| 07/11 | "faça com que a máxima de que não existe mais o na minha máquina funcione seja verdade, deve rodar em todos os ambientes"                            | Imagens para x64 e ARM, finais de linha fixos e CI subindo o projeto sem `.env` nos dois processadores                                                                                                                           | Coloquei como requisito e aprovei a solução                                                                |
| 07/11 | "o que está faltando para completar o projeto A?"                                                                                                    | Lista do que faltava e proposta de ordem                                                                                                                                                                                         | Escolhi a ordem; cogitei o nível B e deixei a decisão para o final                                         |
| 08/11 | "o swagger vai pro localhost? isso vai quebrar pra quem não tá com o projeto instalado"                                                              | O link estava certo, mas a investigação achou um bug: em produção o Swagger abria em branco e o "Try it out" apontava para localhost. Correção e checagem nova no CI                                                             | A dúvida foi minha e revelou um defeito que o pipeline não pegava                                          |
| 08/11 | "o header está muito cheio, principalmente em mobile [...] talvez um botão de config"                                                                | Menu de configurações com som, tema e página Sobre                                                                                                                                                                               | A ideia foi minha; defini o rótulo "Mascotes" em todas as telas                                            |
| 08/11 | Implementar o que faltava do nível A: contrato, carga e trace ("o que falta pra concluir o nivel A?")                                                | Teste de contrato nos dois lados contra o `openapi.yaml`; k6 em 3 estágios com 100 mil pedidos, que achou uma trava disputada na baixa de estoque (p95 de 58 ms para 26 ms a 800 usuários); trace com OpenTelemetry só no Docker | Decidi tentar o nível A, aprovei usar o `openapi.yaml` em vez do Pact e revisei e integrei os PRs          |

## Prompt de testes

```text
Contexto: monorepo DevLand (API Fastify + Knex + PostgreSQL em monólito modular; site React +
Vite). Regras de negócio em docs/ e no CLAUDE.md: moedas por acerto em quiz (cada pergunta paga
uma vez por carteira), economia fechada (acertar tudo paga exatamente todos os mascotes),
pedidos com Idempotency-Key, pagamento com moedas numa transação só, um mascote de cada.

Tarefa: escreva testes automatizados que cubram, para cada regra e cada rota:
1. Caminho feliz: o fluxo completo funcionando, com asserção do resultado e do estado final
   (saldo, estoque, status do pedido), não só do status HTTP.
2. Caminhos tristes: cada erro que a API ou a tela trata, com o código (400, 402, 404, 409,
   422, 503) e a mensagem que a pessoa vê.
3. Casos de borda: limites de cada campo (mínimo, máximo, um a mais, um a menos), formatos
   inválidos, recursos inexistentes, valores zero, listas vazias, dados antigos no banco ou no
   localStorage, e repetições (duplo clique, mesma chave, resposta repetida).
4. Concorrência real no banco: requisições simultâneas disputando o mesmo saldo, a mesma
   pergunta e a mesma Idempotency-Key.
5. Migrations: sobem, descem e sobem de novo; as de dados convertem o formato antigo e
   desfazem a conversão.

Como:
- API: unitários dos services com dublês em memória que imitem as garantias do banco;
  integração com PostgreSQL de verdade via Testcontainers, pela aplicação inteira (app.inject).
- Site: Vitest + Testing Library, testando pelo que a pessoa vê e clica (papéis e nomes
  acessíveis); jornadas completas contra um backend falso com as mesmas regras da API.
- Sem snapshot e sem teste que só repete a implementação. Todo teste tem asserção que falharia
  se a regra quebrasse.
- Cobertura com limite declarado no próprio pipeline, que reprova abaixo dele.
- Se um teste revelar bug, corrija o código, não o teste, e explique o bug.
- Registre em docs/testes.md a estratégia e o que ficou de fora de propósito, com o porquê.
```
