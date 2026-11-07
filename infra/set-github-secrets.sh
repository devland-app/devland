#!/usr/bin/env sh
# Grava no GitHub as conexões com o banco que o Terraform criou, sem mostrar os valores na tela.
# Rode depois de cada "terraform apply" que mudar o banco: sh infra/set-github-secrets.sh
set -eu
cd "$(dirname "$0")"

REPO="devland-app/devland"
TERRAFORM_IMAGE="hashicorp/terraform:1.17.1"

output() {
  docker run --rm -v "$PWD:/infra" -w /infra "$TERRAFORM_IMAGE" output -raw "$1"
}

# Cada ambiente do GitHub (Settings > Environments) tem a própria conexão: o deploy de produção
# migra o banco de produção, e o de pull request migra o branch "preview".
output database_url_production | gh secret set DATABASE_URL --env production --repo "$REPO"
output database_url_preview | gh secret set DATABASE_URL --env preview --repo "$REPO"

echo "Segredos gravados: DATABASE_URL nos ambientes production e preview."
