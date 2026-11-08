# 0004. Deploy gratuito na Vercel e no Neon, com Terraform

- Status: aceita
- Data: 2026-11-07

## Contexto

O deploy precisa ser gratuito. O site não pode dormir, e a API deve responder rápido mesmo que o
plano grátis suspenda algo. Nos planos gratuitos, um servidor Node sempre ligado dorme quando fica
sem acesso ou exige cartão e manutenção.

## Decisão

- **Site** na CDN da Vercel (estático, nunca dorme).
- **API** como função da Vercel em São Paulo (`gru1`), com Fluid compute, no mesmo domínio do
  site, em `/api`: sem CORS e sem requisição de pré-verificação.
- **Banco** PostgreSQL no Neon, também em São Paulo, com pooler de conexões.
- **Terraform** cria o projeto da Vercel, o banco e um branch do banco para os previews.
- **Estratégia de deploy:** cada deploy é imutável e tem endereço próprio; produção é um alias para
  um deles. Cada pull request ganha um preview, com um banco separado do de produção. O CI só publica depois de lint,
  testes, varredura de segredos, imagens e compose verdes; aplica as migrations; publica; e só
  considera pronto se API, catálogo, quizzes e site responderem. Voltar uma versão é apontar o
  alias para o deploy anterior (`vercel rollback`), em segundos, sem rebuild.

## Alternativas consideradas

- **Render, plano grátis (descartada).** O serviço dorme depois de 15 minutos sem acesso, e
  acordar leva de 30 segundos a 1 minuto.
- **Máquina virtual grátis na Oracle Cloud ou no Google Cloud (descartada).** Não dorme, mas exige
  cartão, manutenção do sistema operacional, e a Oracle recolhe VMs ociosas em contas grátis.
- **Supabase para o banco (descartada).** A conta já usa os dois projetos gratuitos.

## Consequências

- Custo zero e nenhum servidor para manter; preview por pull request sem tocar nos dados de
  produção.
- O banco do Neon dorme depois de 5 minutos sem uso: a primeira consulta depois disso leva cerca
  de 1 a 2 segundos. Manter o banco acordado gastaria mais horas de computação do que o plano dá.
- O catálogo e as ilustrações são servidos pela CDN (`s-maxage` e `stale-while-revalidate`), sem
  acordar a função nem o banco.
- O carregador da Vercel não aceita `require()` de módulo ES: o CI checa isso depois do build.
- As imagens Docker continuam publicadas (x64 e ARM): o mesmo sistema sobe em qualquer máquina com
  `docker compose up`.
