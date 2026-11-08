# Infraestrutura (Terraform)

Cria o ambiente de produção e o de preview do DevLand, de graça, sem cartão:

| Recurso                                  | Onde   | Para quê                                                               |
| ---------------------------------------- | ------ | ---------------------------------------------------------------------- |
| Projeto `devland` (São Paulo)            | Neon   | PostgreSQL de produção (branch `main`)                                 |
| Branch `preview` + endpoint              | Neon   | Banco dos deploys de pull request, separado dos dados de produção      |
| Projeto `devland-app`                    | Vercel | Site na CDN e API como função em São Paulo (`gru1`), com Fluid compute |
| Variáveis `DATABASE_URL` e `CORS_ORIGIN` | Vercel | Conexão com o banco certo em cada ambiente                             |

O site fica em https://devland-app.vercel.app. Cada pull request ganha um endereço de preview
próprio, com o banco `preview`.

## Pré-requisitos

- Docker (o Terraform roda pela imagem oficial, sem instalar nada).
- `infra/terraform.tfvars`, fora do git, com os tokens:

  ```hcl
  vercel_api_token = "..."   # Vercel > Account Settings > Tokens
  vercel_team_id   = "team_..." # Vercel > Settings > General > Team ID
  neon_api_key     = "..."   # Neon > Account settings > API keys
  neon_org_id      = "org-..." # Neon > Organization settings > General information
  ```

## Comandos

Na raiz do repositório:

```bash
alias tf='docker run --rm -v "$PWD/infra:/infra" -w /infra hashicorp/terraform:1.17.1'
tf init      # baixa os provedores (versões fixadas em .terraform.lock.hcl)
tf plan      # mostra o que vai mudar
tf apply     # cria ou atualiza
sh infra/set-github-secrets.sh   # grava DATABASE_URL nos ambientes do GitHub
```

O deploy em si não passa por aqui: o CI publica na Vercel a cada pull request (preview) e a cada
push na `main` (produção), depois de aplicar as migrations no banco do ambiente.

## Decisões

- **Estado local, fora do git.** O `terraform.tfstate` guarda a senha do banco, então fica só na
  máquina de quem aplica, ignorado pelo git. Com mais de uma pessoa aplicando, o próximo passo seria
  um backend remoto (HCP Terraform, gratuito até 500 recursos).
- **Terraform fora do CI.** A infraestrutura muda raramente e precisa de tokens com permissão de
  criar e apagar projetos. O CI só usa um token de deploy e as conexões com o banco.
- **Neon e Vercel em São Paulo**, na mesma região, para a consulta ao banco não atravessar o
  continente. O plano grátis do Neon desliga o banco depois de 5 minutos sem uso: a primeira
  consulta depois disso demora um pouco mais. Manter o banco acordado gastaria mais horas de
  computação do que o plano grátis dá.
