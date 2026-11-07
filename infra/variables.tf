# Os valores ficam em terraform.tfvars, fora do git (veja infra/README.md).

variable "vercel_api_token" {
  description = "Token da Vercel (Account Settings > Tokens)"
  type        = string
  sensitive   = true
}

variable "vercel_team_id" {
  description = "Team ID da conta na Vercel (Settings > General)"
  type        = string
}

variable "neon_api_key" {
  description = "Chave da API do Neon (Account settings > API keys)"
  type        = string
  sensitive   = true
}

variable "neon_org_id" {
  description = "Organization ID do Neon (Settings > General information)"
  type        = string
}

variable "project_name" {
  description = "Nome do projeto na Vercel; vira o domínio <nome>.vercel.app"
  type        = string
  default     = "devland-app"
}

variable "region" {
  description = "Região da Vercel para a API; o banco fica na região equivalente da AWS"
  type        = string
  default     = "gru1"
}

variable "neon_region" {
  description = "Região do Neon, a mesma cidade da função da Vercel"
  type        = string
  default     = "aws-sa-east-1"
}
