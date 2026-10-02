-- Parameters contain only safe user fields, bcrypt hashes, and generated sales.
-- The script inserts missing seed IDs only. It never updates or deletes data.
CREATE TEMP TABLE seed_users AS
SELECT JSON_VALUE(item, '$.user_id') user_id,
  JSON_VALUE(item, '$.name') name, JSON_VALUE(item, '$.email') email,
  JSON_VALUE(item, '$.password_hash') password_hash,
  JSON_VALUE(item, '$.role') role, JSON_VALUE(item, '$.status') status,
  TIMESTAMP(JSON_VALUE(item, '$.created_at')) created_at
FROM UNNEST(JSON_QUERY_ARRAY(@users)) item;

CREATE TEMP TABLE seed_sales AS
SELECT JSON_VALUE(item, '$.sale_id') sale_id,
  DATE(JSON_VALUE(item, '$.sale_date')) sale_date,
  JSON_VALUE(item, '$.product') product, JSON_VALUE(item, '$.category') category,
  JSON_VALUE(item, '$.region') region,
  CAST(JSON_VALUE(item, '$.quantity') AS INT64) quantity,
  CAST(JSON_VALUE(item, '$.revenue') AS NUMERIC) revenue,
  CAST(JSON_VALUE(item, '$.cost') AS NUMERIC) cost,
  JSON_VALUE(item, '$.created_by') created_by,
  TIMESTAMP(JSON_VALUE(item, '$.created_at')) created_at
FROM UNNEST(JSON_QUERY_ARRAY(@sales)) item;

BEGIN TRANSACTION;

-- Repeat identity checks inside the transaction before either insert.
ASSERT NOT EXISTS (
  SELECT 1 FROM `id-fpoc-0608-data-posindo.sales_dashboard.users` existing
  JOIN UNNEST(JSON_QUERY_ARRAY(@identities)) expected
  ON existing.user_id = JSON_VALUE(expected, '$.user_id') OR existing.email = JSON_VALUE(expected, '$.email')
  WHERE existing.user_id IS DISTINCT FROM JSON_VALUE(expected, '$.user_id')
    OR existing.email IS DISTINCT FROM JSON_VALUE(expected, '$.email')
    OR existing.name IS DISTINCT FROM JSON_VALUE(expected, '$.name')
    OR existing.role IS DISTINCT FROM JSON_VALUE(expected, '$.role')
    OR existing.status IS DISTINCT FROM JSON_VALUE(expected, '$.status')
) AS 'Existing identity conflicts with demo seed';

INSERT INTO `id-fpoc-0608-data-posindo.sales_dashboard.users`
  (user_id, name, email, password_hash, role, status, created_at)
SELECT user_id, name, email, password_hash, role, status, created_at
FROM seed_users seed
WHERE NOT EXISTS (SELECT 1 FROM `id-fpoc-0608-data-posindo.sales_dashboard.users` existing WHERE existing.user_id = seed.user_id)
  AND NOT EXISTS (SELECT 1 FROM `id-fpoc-0608-data-posindo.sales_dashboard.users` existing WHERE existing.email = seed.email);

INSERT INTO `id-fpoc-0608-data-posindo.sales_dashboard.sales`
  (sale_id, sale_date, product, category, region, quantity, revenue, cost, created_by, created_at)
SELECT sale_id, sale_date, product, category, region, quantity, revenue, cost, created_by, created_at
FROM seed_sales seed
WHERE NOT EXISTS (SELECT 1 FROM `id-fpoc-0608-data-posindo.sales_dashboard.sales` existing WHERE existing.sale_id = seed.sale_id);

COMMIT TRANSACTION;

SELECT
  (SELECT COUNT(*) FROM `id-fpoc-0608-data-posindo.sales_dashboard.users` WHERE user_id IN ('DEMO_ADMIN', 'DEMO_ANALYST', 'DEMO_VIEWER')) demo_users,
  (SELECT COUNT(*) FROM `id-fpoc-0608-data-posindo.sales_dashboard.sales` WHERE sale_id IN (SELECT sale_id FROM seed_sales)) demo_sales;
