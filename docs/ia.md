# Uso de IA

Ferramenta: Claude (Anthropic). A IA sugeriu alternativas e gerou rascunhos; as decisões finais e os
commits são da autora.

| Data  | Prompt (resumo)                                                                         | Resultado                                                              | O que decidi                                                        |
| ----- | --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------- |
| 05/11 | Ler o enunciado do projeto final e sugerir tecnologias gratuitas, sem cartão de crédito | Mapeamento dos requisitos do nível A para ferramentas gratuitas        | Nível A, Render para a API, Netlify para o front, Neon para o banco |
| 05/11 | Ideia de marketplace fofo de miniaturas de tecnologia                                   | Tema DevLand com mascotes originais (não usar marcas registradas)      | Adotado o tema DevLand                                              |
| 05/11 | Criar monorepo com npm workspaces, lint, commits semânticos                             | Estrutura `apps/api` e `apps/web`, ESLint, Prettier, husky, commitlint | Revisado e commitado por mim em commits pequenos                    |
| 05/11 | Docker, imagens no Docker Hub a cada atualização, segredos no GitHub Secrets            | Dockerfiles multi-stage, compose, workflow de CI com gitleaks e Trivy  | Revisado e testado localmente antes de subir                        |
| 05/11 | Pasta `.claude` com CLAUDE.md e skills de acessibilidade, segurança e modularidade      | Contexto do projeto e checklists                                       | Adotado                                                             |
