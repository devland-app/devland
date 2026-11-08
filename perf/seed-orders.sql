-- Dados sintéticos para o teste de carga (perf/load.js): 100 mil pedidos, cerca de 70% pagos, e 200
-- carteiras com saldo folgado. Roda só no banco do compose, pelo perfil "perf":
--   docker compose --profile perf run --rm seed
-- Os ids são derivados do número do pedido (md5), para o k6 saber quais existem sem consultar o banco.
BEGIN;

-- A carga mede desempenho: mascote esgotado ou moeda acabando só gerariam recusas.
UPDATE products SET stock = 100000000;

CREATE TEMP TABLE catalog ON COMMIT DROP AS
  SELECT row_number() OVER (ORDER BY id) - 1 AS position, id, name, price_coins FROM products;

INSERT INTO wallets (id, balance_coins)
  SELECT md5('carga-carteira-' || n)::uuid, 1000000000 FROM generate_series(1, 200) AS n
  ON CONFLICT (id) DO UPDATE SET balance_coins = EXCLUDED.balance_coins;

CREATE TEMP TABLE synthetic ON COMMIT DROP AS
  SELECT n,
         md5('carga-pedido-' || n)::uuid AS order_id,
         n % 10 < 7 AS paid,
         now() - (n % 129600) * interval '1 minute' AS created_at,
         c.id AS product_id, c.name AS product_name, c.price_coins
  FROM generate_series(1, 100000) AS n
  JOIN catalog AS c ON c.position = n % (SELECT count(*) FROM catalog);

INSERT INTO orders (id, idempotency_key, status, total_coins, created_at, paid_at)
  SELECT order_id, 'carga-' || n, CASE WHEN paid THEN 'paid' ELSE 'awaiting_payment' END,
         price_coins, created_at, CASE WHEN paid THEN created_at + interval '2 minutes' END
  FROM synthetic
  ON CONFLICT DO NOTHING;

INSERT INTO order_items (order_id, product_id, product_name, unit_price_coins, quantity)
  SELECT order_id, product_id, product_name, price_coins, 1 FROM synthetic
  ON CONFLICT DO NOTHING;

INSERT INTO payments (id, order_id, method, status, amount_coins, receipt_code, created_at)
  SELECT md5('carga-pagamento-' || n)::uuid, order_id, 'coins', 'approved', price_coins,
         'DL-' || upper(substr(md5(n::text), 1, 8)), created_at + interval '2 minutes'
  FROM synthetic WHERE paid
  ON CONFLICT DO NOTHING;

COMMIT;

-- Sem estatísticas novas, o planejador do banco decidiria como se as tabelas ainda estivessem vazias.
ANALYZE products, wallets, orders, order_items, payments;

SELECT (SELECT count(*) FROM orders) AS pedidos, (SELECT count(*) FROM payments) AS pagamentos;
