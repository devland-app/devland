import type { ReactNode } from "react";

import { ExternalLink } from "../../shared/ui/ExternalLink.tsx";

export const REPOSITORY_URL = "https://github.com/devland-app/devland";

function repoLink(path: string, label: string) {
  return <ExternalLink href={`${REPOSITORY_URL}/${path}`}>{label}</ExternalLink>;
}

export interface AboutSection {
  id: string;
  // Mascote que apresenta o assunto (o slug do catálogo). Sem ele no catálogo, o item fica sem desenho.
  mascot: string;
  title: string;
  teaser: string;
  body: ReactNode;
}

// O que existe no projeto hoje. Quando algo novo entrar (uma métrica, um teste, um mascote), este é o
// lugar de contar.
export const ABOUT_SECTIONS: AboutSection[] = [
  {
    id: "tecnologias",
    mascot: "caranguejo-dos-conteineres",
    title: "Tecnologias",
    teaser: "React, Fastify, PostgreSQL e Docker, tudo em TypeScript",
    body: (
      <ul>
        <li>
          <strong>Site:</strong> React 19 com Vite e TypeScript. O visual de massinha é CSS puro,
          com tema claro e escuro.
        </li>
        <li>
          <strong>API:</strong> Node 22 com Fastify 5, Knex e PostgreSQL 17.
        </li>
        <li>
          <strong>Testes:</strong> Vitest, Testing Library e Testcontainers, que sobe um PostgreSQL
          de verdade para os testes da API.
        </li>
        <li>
          <strong>Entrega:</strong> Docker, GitHub Actions, Terraform, Vercel e Neon.
        </li>
        <li>
          <strong>Desempenho:</strong> k6, métricas no formato do Prometheus e traces com
          OpenTelemetry.
        </li>
      </ul>
    ),
  },
  {
    id: "especificacao-e-ia",
    mascot: "corujinha-das-branches",
    title: "Feito com IA, guiado por especificação",
    teaser: "Primeiro as regras, depois o código",
    body: (
      <>
        <p>
          A DevLand foi feita com desenvolvimento guiado por especificação (spec-driven development)
          e um assistente de IA, o Claude Code. Antes do código vêm as regras: um arquivo de
          especificação descreve a loja, a arquitetura, as convenções e o que conta como pronto. A
          IA escreve seguindo essas regras, e cada mudança passa por revisão, testes e pipeline
          antes de entrar.
        </p>
        <p>
          <strong>Skills</strong> são guias que a IA consulta em tarefas específicas:
        </p>
        <ul>
          <li>
            <strong>Acessibilidade:</strong> a lista de conferência da WCAG 2.2 AA para cada tela.
          </li>
          <li>
            <strong>Modularidade:</strong> onde cada código mora e quem pode depender de quem.
          </li>
          <li>
            <strong>Segurança:</strong> segredos, validação de entrada, Docker e pipeline.
          </li>
        </ul>
        <p>
          Os pedidos feitos à IA que influenciaram decisões estão registrados em{" "}
          {repoLink("blob/main/docs/ia.md", "docs/ia.md")}.
        </p>
      </>
    ),
  },
  {
    id: "arquitetura",
    mascot: "polvo-orquestrador",
    title: "Arquitetura em módulos",
    teaser: "Um monólito modular, com fronteiras bem marcadas",
    body: (
      <>
        <p>
          A API é um monólito modular: um deploy só, dividido em cinco módulos (catálogo, carteiras,
          quizzes, pagamentos e pedidos). Cada um é dono das próprias tabelas e só conversa com os
          outros por uma interface. Dentro do módulo, a rota cuida do HTTP, o serviço cuida da regra
          e o repositório cuida do banco.
        </p>
        <p>
          O pagamento troca de forma de pagar sem mexer no resto (padrão Strategy) e acontece numa
          transação só: trava o pedido, debita as moedas, marca como pago e baixa o estoque. No
          site, cada funcionalidade tem a própria pasta, e uma não importa a outra.
        </p>
        <p>
          Por que não microsserviços? A resposta está nas{" "}
          {repoLink("tree/main/docs/adr", "decisões de arquitetura (ADRs)")}, e o desenho das peças,
          nos {repoLink("blob/main/docs/c4/README.md", "diagramas C4")}.
        </p>
      </>
    ),
  },
  {
    id: "seguranca",
    mascot: "raposa-dos-segredos",
    title: "Segurança",
    teaser: "Sem dados pessoais e sem segredos no código",
    body: (
      <ul>
        <li>
          Sem cadastro: o site não pede nome, e-mail nem cartão. Carteira e pedidos são
          identificados por códigos aleatórios, impossíveis de adivinhar.
        </li>
        <li>
          Toda entrada é validada, e campo desconhecido é recusado. O preço vem sempre do banco,
          nunca do navegador, e as consultas ao banco são sempre parametrizadas.
        </li>
        <li>
          O saldo nunca fica negativo, e o mesmo acerto ou o mesmo pedido não movimenta a carteira
          duas vezes, nem com cliques simultâneos.
        </li>
        <li>
          Segredos ficam fora do código, e o gitleaks procura vazamentos a cada commit e a cada pull
          request.
        </li>
        <li>
          Dependências auditadas e imagens Docker sem usuário root, examinadas pelo Trivy antes de
          serem publicadas.
        </li>
        <li>
          Os desenhos são limpos antes de entrar na página, e erros internos aparecem só no log,
          nunca para quem usa o site.
        </li>
      </ul>
    ),
  },
  {
    id: "acessibilidade",
    mascot: "tartaruga-do-rollback",
    title: "Acessibilidade",
    teaser: "Cada pessoa no seu ritmo, seguindo a WCAG 2.2 AA",
    body: (
      <ul>
        <li>Tudo funciona só com o teclado, com o foco sempre visível.</li>
        <li>
          HTML semântico e nomes claros para leitores de tela. As janelas são as nativas do
          navegador: prendem o foco e fecham com Esc.
        </li>
        <li>Contraste conferido nos temas claro e escuro.</li>
        <li>Botões de liga e desliga dizem o estado em texto, não só na cor.</li>
        <li>As animações respeitam a preferência por menos movimento, e o som começa desligado.</li>
      </ul>
    ),
  },
  {
    id: "devops",
    mascot: "lesminha-do-pipeline",
    title: "Do commit à produção",
    teaser: "Cada mudança passa por etapas automáticas",
    body: (
      <ul>
        <li>
          Cada mudança nasce numa branch, com commits padronizados (Conventional Commits), e entra
          por pull request.
        </li>
        <li>Antes de cada commit: busca de segredos, lint e formatação.</li>
        <li>
          Em cada pull request: build, testes com cobertura mínima, auditoria de dependências,
          conferência do contrato da API e varredura das imagens Docker.
        </li>
        <li>
          O projeto inteiro sobe com <code>docker compose up</code> em processadores x64 e ARM, e um
          teste de desempenho confere o objetivo de latência.
        </li>
        <li>Cada release ganha um número de versão e imagens novas no Docker Hub.</li>
        <li>Uma feature flag liga e desliga as animações da vitrine, sem mexer no código.</li>
      </ul>
    ),
  },
  {
    id: "deploy",
    mascot: "joao-de-barro-da-infraestrutura",
    title: "Deploy e infraestrutura",
    teaser: "Infraestrutura como código, de graça e sem dormir",
    body: (
      <ul>
        <li>
          O site fica na CDN da Vercel, e a API roda como função em São Paulo, no mesmo endereço. O
          banco PostgreSQL fica no Neon, também em São Paulo.
        </li>
        <li>
          Tudo isso é criado pelo Terraform, a partir da pasta{" "}
          {repoLink("tree/main/infra", "infra")}: a infraestrutura também é código.
        </li>
        <li>
          Cada pull request ganha um endereço de prévia, com um banco separado do de produção.
        </li>
        <li>
          Depois de publicar, o pipeline confere se a API, o catálogo e o site respondem. Voltar
          para a versão anterior leva segundos.
        </li>
      </ul>
    ),
  },
  {
    id: "testes",
    mascot: "abelha-dos-logs",
    title: "Testes e observabilidade",
    teaser: "Caminhos felizes, tristes e de borda",
    body: (
      <ul>
        <li>
          Testes de unidade e de integração, com um PostgreSQL de verdade, cobrem o caminho feliz,
          os erros e os casos de borda: pagamento em dobro, moedas creditadas duas vezes, gabarito
          vazando, volta de versão apagando dados.
        </li>
        <li>No site, os testes clicam como uma pessoa: pelos nomes que o leitor de tela lê.</li>
        <li>
          Teste de contrato nos dois lados: a API e o site são conferidos contra o mesmo{" "}
          <code>openapi.yaml</code>.
        </li>
        <li>
          A API registra cada requisição em JSON estruturado e mede a duração de todas elas em{" "}
          <code>/metrics</code>. No Docker, dá para ver cada requisição por dentro com um trace no
          Jaeger.
        </li>
        <li>Detalhes em {repoLink("blob/main/docs/testes.md", "docs/testes.md")}.</li>
      </ul>
    ),
  },
  {
    id: "desempenho",
    mascot: "castor-do-cache",
    title: "Desempenho",
    teaser: "95% das respostas em menos de meio segundo",
    body: (
      <ul>
        <li>
          Objetivo de serviço (SLO): 95% das requisições abaixo de 500 ms e menos de 1% de erro.
        </li>
        <li>
          Um teste de fumaça com k6 confere isso a cada pull request. Em produção, o p95 medido
          ficou em torno de 200 ms.
        </li>
        <li>O catálogo e os desenhos vêm do cache da CDN, sem acordar o servidor.</li>
        <li>
          Um teste de carga em 3 estágios, com 100 mil pedidos, achou uma trava disputada na baixa
          de estoque. Com a correção, o p95 a 800 usuários caiu de 58 ms para 26 ms.
        </li>
        <li>Detalhes em {repoLink("blob/main/docs/desempenho.md", "docs/desempenho.md")}.</li>
      </ul>
    ),
  },
];
