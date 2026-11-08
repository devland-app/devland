# Desempenho e observabilidade

Um objetivo de serviço (SLO) declarado, uma métrica que mostra se ele está sendo cumprido e um
teste de fumaça que mede a latência de verdade, local e em produção.

## SLO

| Sinal    | Indicador (SLI)                                     | Objetivo (SLO)       |
| -------- | --------------------------------------------------- | -------------------- |
| Latência | Duração das requisições à API                       | 95% abaixo de 500 ms |
| Erros    | Requisições que falham (status 5xx ou sem resposta) | Menos de 1%          |

**Por que 500 ms:** cada clique no site (abrir a vitrine, começar um quiz, responder, adotar) é uma
chamada à API. Um segundo é o limite clássico para a pessoa não perder o fio do que está fazendo;
500 ms para a API deixa a outra metade para a rede do celular e para a tela se atualizar. A API
responde em poucos milissegundos no Docker e na casa de 100 a 250 ms em produção (medidos abaixo),
então o objetivo tem folga.

**Onde o SLO é conferido:**

- **No CI, a cada pull request:** o teste de fumaça roda contra o `docker compose`. O SLO é limite
  (threshold) do k6: se o p95 passar de 500 ms ou houver mais de 1% de erro, o pipeline falha.
- **Em produção:** o mesmo teste, em modo só leitura, e a métrica `/api/metrics`.

## Métrica

`GET /metrics` (em produção, `/api/metrics`) devolve as métricas no formato de texto do
Prometheus. A métrica da aplicação é uma só, `http_request_duration_seconds`, um histograma com três
rótulos:

- `method`: GET, POST...
- `route`: o molde da rota (`/orders/:id`), nunca a URL. Com o id, cada pedido criaria uma série
  nova, e a memória cresceria sem limite. Rotas que não existem ficam como `unmatched`.
- `status_code`: o status da resposta.

```text
http_request_duration_seconds_bucket{le="0.5",method="GET",route="/products",status_code="200"} 120
http_request_duration_seconds_bucket{le="+Inf",method="GET",route="/products",status_code="200"} 120
http_request_duration_seconds_sum{method="GET",route="/products",status_code="200"} 0.193
http_request_duration_seconds_count{method="GET",route="/products",status_code="200"} 120
```

Do mesmo histograma saem os três sinais do método RED (taxa, erros e duração) e o cumprimento do
SLO. Uma das faixas é exatamente 0,5 s, o limite do SLO, para que a conta seja direta:

| Pergunta                                 | Consulta (PromQL)                                                                                                             |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Quantas requisições por segundo? (taxa)  | `sum(rate(http_request_duration_seconds_count[5m]))`                                                                          |
| Que fração falha? (erros)                | `sum(rate(http_request_duration_seconds_count{status_code=~"5.."}[5m])) / sum(rate(http_request_duration_seconds_count[5m]))` |
| Qual o p95? (duração)                    | `histogram_quantile(0.95, sum by (le) (rate(http_request_duration_seconds_bucket[5m])))`                                      |
| Que fração ficou abaixo de 500 ms? (SLO) | `sum(rate(http_request_duration_seconds_bucket{le="0.5"}[5m])) / sum(rate(http_request_duration_seconds_count[5m]))`          |

A resposta também traz as métricas padrão do processo Node (CPU, memória, atraso do event loop).
A coleta (`/metrics`) não entra na conta, e a resposta nunca vai para o cache da CDN.

**Limitação na Vercel:** a API roda como função, e cada instância conta só as requisições que
passaram por ela; uma instância nova começa do zero. Para somar todas, as instâncias teriam de
enviar as métricas para um coletor externo (por exemplo, OpenTelemetry com Grafana Cloud). No
Docker há uma instância só, e a métrica é completa.

## Teste de fumaça (k6)

[`perf/smoke.js`](../perf/smoke.js): 2 usuários virtuais por 30 segundos. Cada um consulta a saúde,
a vitrine e a lista de quizzes, começa uma tentativa de quiz e espera 1 segundo, como alguém
navegando. É um teste de fumaça: confirma que o sistema responde dentro do SLO com pouca carga. Não
mede o limite do sistema.

```bash
# Local: sobe banco e API, se ainda não estiverem no ar, e roda o teste
docker compose --profile perf run --rm k6

# Produção, só leitura (não cria carteiras nem tentativas no banco de verdade)
docker compose --profile perf run --rm --no-deps \
  -e BASE_URL=https://devland-app.vercel.app/api -e READ_ONLY=1 k6
```

O k6 roda pela imagem oficial, definida no `docker-compose.yml` com o perfil `perf`: não precisa
instalar nada, e o comando é o mesmo em macOS, Linux e Windows.

### Resultados (7 de novembro de 2026)

p95 por rota, medido pelo k6 (do lado de quem chama):

| Rota                             | Docker local |     Produção |
| -------------------------------- | -----------: | -----------: |
| `GET /health` (consulta o banco) |      4,42 ms |     229,3 ms |
| `GET /products`                  |      3,33 ms |     157,6 ms |
| `GET /quizzes`                   |      3,84 ms |     201,2 ms |
| `POST /quizzes/:slug/attempts`   |      8,52 ms |            — |
| **Todas**                        |  **6,00 ms** | **204,0 ms** |
| Requisições / erros              |      241 / 0 |      132 / 0 |

- **Docker local:** API, banco e k6 na mesma máquina, sem rede no meio. A própria métrica da API
  confirma: a vitrine levou em média 1,6 ms dentro da API (`_sum / _count`), contra 2,2 ms medidos
  pelo k6.
- **Produção:** medido pela internet, da máquina de desenvolvimento até a Vercel em São Paulo. A
  maior parte do tempo é o caminho pela rede. A vitrine vem do cache da CDN, sem passar pela
  função, e tem mediana de 108 ms; a saúde passa pela função e pelo banco e tem 126 ms. Função e
  banco somam uns 18 ms; o resto é a ida e volta até São Paulo. A tentativa de quiz fica de fora
  para não gravar dados de teste no banco de produção.

### Banco que dorme

O Neon gratuito suspende o banco depois de 5 minutos sem uso. A primeira requisição que consulta o
banco depois disso espera ele acordar:

| Requisição a `/api/health` depois de 7 minutos sem acesso | Tempo total |
| --------------------------------------------------------- | ----------: |
| Primeira (função e banco acordando)                       |      1,49 s |
| Segunda                                                   |      0,33 s |
| Terceira                                                  |      0,33 s |

Medido com `curl`, que abre uma conexão nova a cada chamada: por isso as requisições já acordadas
levam mais que no k6, que reaproveita a conexão. O 1,49 s inclui acordar a função e o banco.

Como acontece só depois de um período sem acesso, essa espera fica fora dos 95% mais rápidos de
um uso normal, mas é o pior caso de quem chega a um site vazio.

## O que fica para depois

- **Teste de carga com estágios** (subir, sustentar e descer a carga) e com volume de dados, para
  achar o gargalo e medir o antes e o depois de uma otimização. O teste de fumaça mostra que o
  sistema cumpre o SLO com pouca carga, não onde ele quebra.
- **Rastreamento distribuído** (OpenTelemetry), útil quando uma requisição passa por vários
  serviços. Aqui ela passa por um processo e um banco, e a métrica por rota já aponta onde está a
  demora.
