# Contexto (C4, nível 1)

Quem usa o DevLand e com quais sistemas ele conversa.

```mermaid
flowchart TB
    visitante["<b>Estudante</b><br/>[Pessoa]<br/>Responde quizzes, ganha moedas<br/>e adota mascotes"]
    dev["<b>Pessoa desenvolvedora</b><br/>[Pessoa]<br/>Escreve o código e abre<br/>pull requests"]

    devland["<b>DevLand</b><br/>[Sistema]<br/>Site educativo de DevOps: quizzes,<br/>carteira de moedas e coleção de mascotes"]

    github["<b>GitHub</b><br/>[Sistema externo]<br/>Código, pull requests e CI<br/>(GitHub Actions)"]
    dockerhub["<b>Docker Hub</b><br/>[Sistema externo]<br/>Imagens da API e do site<br/>(x64 e ARM)"]
    vercel["<b>Vercel</b><br/>[Sistema externo]<br/>CDN do site e função da API"]
    neon["<b>Neon</b><br/>[Sistema externo]<br/>PostgreSQL gerenciado"]

    visitante -- "Usa pelo navegador<br/>[HTTPS]" --> devland
    dev -- "Envia código<br/>[git]" --> github
    github -- "Publica imagens" --> dockerhub
    github -- "Faz o deploy<br/>[Vercel CLI]" --> vercel
    github -- "Aplica migrations" --> neon
    devland -- "Roda em" --> vercel
    devland -- "Guarda dados em<br/>[SQL/TLS]" --> neon

    classDef person fill:#08427b,stroke:#052e56,color:#fff
    classDef system fill:#1168bd,stroke:#0b4884,color:#fff
    classDef external fill:#999,stroke:#6b6b6b,color:#fff
    class visitante,dev person
    class devland system
    class github,dockerhub,vercel,neon external
```

Não há login nem cadastro: a carteira e os pedidos são identificados por UUID, guardados no
navegador. O sistema não pede nenhum dado pessoal nem de pagamento.
