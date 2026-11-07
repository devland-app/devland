**Nível: A (avançado)**

# DevLand

Marketplace de miniaturas fofas inspiradas em conceitos de DevOps: o caranguejo dos contêineres,
a lesminha do pipeline, a corujinha das branches e a turma toda.

Projeto final do curso de DevOps e Engenharia de Software do Geração Tech 4.0.

## Estrutura

Monorepo com npm workspaces:

```
apps/
  api/   API do marketplace (monólito modular: catálogo, pedidos, pagamento)
  web/   Vitrine em React + Vite
docs/    ADRs, C4, OpenAPI, desempenho e uso de IA
```

## Pré-requisitos

- Node.js 22 (veja `.nvmrc`)
- Docker e Docker Compose

## Como rodar

```bash
npm install
```

Instruções completas de subida e testes serão adicionadas conforme os módulos forem entregues.

## Fluxo de contribuição

- Uma branch por feature: `feat/...`, `fix/...`, `chore/...`, `docs/...`, `test/...`
- Commits semânticos ([Conventional Commits](https://www.conventionalcommits.org/pt-br/)), pequenos e focados
- Merge na `main` via Pull Request
