output "site_url" {
  description = "Endereço do DevLand em produção"
  value       = local.site_url
}

output "vercel_project_id" {
  description = "Vai para a variável VERCEL_PROJECT_ID do GitHub"
  value       = vercel_project.devland.id
}

output "vercel_org_id" {
  description = "Vai para a variável VERCEL_ORG_ID do GitHub"
  value       = var.vercel_team_id
}

output "database_url_production" {
  description = "Conexão direta com o banco de produção, para as migrations no CI"
  value       = neon_project.devland.connection_uri
  sensitive   = true
}

output "database_url_preview" {
  description = "Conexão direta com o branch de preview, para as migrations no CI"
  value       = local.preview_direct_url
  sensitive   = true
}
