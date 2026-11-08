provider "vercel" {
  api_token = var.vercel_api_token
  team      = var.vercel_team_id
}

provider "neon" {
  api_key = var.neon_api_key
}

locals {
  site_url = "https://${var.project_name}.vercel.app"
}

# Banco: PostgreSQL gerenciado e gratuito no Neon, em São Paulo, ao lado da função da API.
# O plano grátis desliga o banco depois de 5 min sem uso; a primeira consulta depois disso acorda.
resource "neon_project" "devland" {
  name       = "devland"
  org_id     = var.neon_org_id
  region_id  = var.neon_region
  pg_version = 17
  # Plano grátis: até 6 h de histórico para restaurar o banco num ponto do tempo.
  history_retention_seconds = 21600

  branch {
    name          = "main"
    database_name = "devland"
    role_name     = "devland"
  }
}

# Ambiente de preview: um branch do banco (cópia instantânea) só para os deploys de pull request,
# para que testar uma mudança nunca mexa nos dados de produção.
resource "neon_branch" "preview" {
  project_id = neon_project.devland.id
  parent_id  = neon_project.devland.default_branch_id
  name       = "preview"
}

resource "neon_endpoint" "preview" {
  project_id = neon_project.devland.id
  branch_id  = neon_branch.preview.id
  type       = "read_write"
}

locals {
  # Mesmo usuário e senha do branch principal (o branch herda os papéis); muda só o endereço.
  preview_credentials = "${neon_project.devland.database_user}:${neon_project.devland.database_password}"
  preview_database    = "${neon_project.devland.database_name}?sslmode=require"
  preview_pooled_url  = "postgresql://${local.preview_credentials}@${neon_endpoint.preview.host_pooling}/${local.preview_database}"
  preview_direct_url  = "postgresql://${local.preview_credentials}@${neon_endpoint.preview.host}/${local.preview_database}"
}

# Site e API num projeto só: o site sai da CDN da Vercel (nunca dorme) e a API vira uma função em
# /api. O build e as rotas estão no vercel.json, versionado com o código.
resource "vercel_project" "devland" {
  name         = var.project_name
  node_version = "22.x"

  resource_config = {
    # Fluid compute: uma instância atende várias requisições, o que reduz as partidas a frio.
    fluid                    = true
    function_default_regions = [var.region]
  }

  # Previews abertos, sem login na Vercel: o projeto não guarda nada privado.
  vercel_authentication = {
    deployment_type = "none"
  }
}

# A função usa o endereço com pooler (muitas conexões curtas); as migrations usam o direto, no CI.
resource "vercel_project_environment_variable" "database_url_production" {
  project_id = vercel_project.devland.id
  key        = "DATABASE_URL"
  value      = neon_project.devland.connection_uri_pooler
  target     = ["production"]
  sensitive  = true
}

resource "vercel_project_environment_variable" "database_url_preview" {
  project_id = vercel_project.devland.id
  key        = "DATABASE_URL"
  value      = local.preview_pooled_url
  target     = ["preview"]
  sensitive  = true
}

# Site e API no mesmo domínio: o CORS não entra em jogo, mas a API exige a variável em produção.
resource "vercel_project_environment_variable" "cors_origin" {
  project_id = vercel_project.devland.id
  key        = "CORS_ORIGIN"
  value      = local.site_url
  target     = ["production", "preview"]
  sensitive  = false
}
