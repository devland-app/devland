terraform {
  required_version = ">= 1.17"

  required_providers {
    vercel = {
      source  = "vercel/vercel"
      version = "~> 5.26"
    }
    neon = {
      source  = "kislerdm/neon"
      version = "~> 0.18"
    }
  }
}
