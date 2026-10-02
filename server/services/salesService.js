import { randomUUID } from 'node:crypto'
import env from '../config/env.js'
import { createBigQueryService } from './bigqueryService.js'

export function createSalesService(queryService) {
  function tables() {
    const { projectId, dataset } = env.bigquery
    if (!/^[a-z][a-z0-9-]+$/.test(projectId) || !/^[A-Za-z0-9_]+$/.test(dataset)) {
      throw new Error('Invalid BigQuery sales table configuration')
    }
    return { sales: `\`${projectId}.${dataset}.sales\``, audit: `\`${projectId}.${dataset}.audit_logs\`` }
  }
  const query = (sql, params) => (queryService ?? createBigQueryService()).query(sql, params)
  const columns = `sale_id, CAST(sale_date AS STRING) AS sale_date, product, category, region,
    quantity, CAST(revenue AS STRING) AS revenue, CAST(cost AS STRING) AS cost, created_by,
    FORMAT_TIMESTAMP('%Y-%m-%dT%H:%M:%E6SZ', created_at, 'UTC') AS created_at`

  return {
    async list({ limit, offset }) {
      return query(`SELECT ${columns} FROM ${tables().sales}
        ORDER BY sale_date DESC, created_at DESC, sale_id DESC LIMIT @limit OFFSET @offset`, { limit, offset })
    },
    async create(sale, userId) {
      const { sales, audit } = tables()
      const saleId = `SALE_${randomUUID()}`
      const params = { ...sale, saleId, userId, logId: randomUUID(), details: JSON.stringify({ sale_id: saleId }) }
      const rows = await query(`
        DECLARE now TIMESTAMP DEFAULT CURRENT_TIMESTAMP();
        BEGIN TRANSACTION;
        INSERT INTO ${sales} (sale_id, sale_date, product, category, region, quantity, revenue, cost, created_by, created_at)
        VALUES (@saleId, CAST(@sale_date AS DATE), @product, @category, @region, @quantity,
          CAST(@revenue AS NUMERIC), CAST(@cost AS NUMERIC), @userId, now);
        INSERT INTO ${audit} (log_id, user_id, action, resource, details, created_at)
        VALUES (@logId, @userId, 'CREATE_SALE', 'sales', @details, now);
        COMMIT TRANSACTION;
        SELECT @saleId AS sale_id, @sale_date AS sale_date, @product AS product, @category AS category,
          @region AS region, @quantity AS quantity, CAST(CAST(@revenue AS NUMERIC) AS STRING) AS revenue,
          CAST(CAST(@cost AS NUMERIC) AS STRING) AS cost, @userId AS created_by,
          FORMAT_TIMESTAMP('%Y-%m-%dT%H:%M:%E6SZ', now, 'UTC') AS created_at;
      `, params)
      return rows[0]
    },
    async remove(saleId, userId) {
      const { sales, audit } = tables()
      const rows = await query(`
        DECLARE deleted_count INT64 DEFAULT 0;
        BEGIN TRANSACTION;
        DELETE FROM ${sales} WHERE sale_id = @saleId;
        SET deleted_count = @@row_count;
        ASSERT deleted_count <= 1 AS 'Ambiguous sale identity';
        IF deleted_count = 1 THEN
          INSERT INTO ${audit} (log_id, user_id, action, resource, details, created_at)
          VALUES (@logId, @userId, 'DELETE_SALE', 'sales', @details, CURRENT_TIMESTAMP());
        END IF;
        COMMIT TRANSACTION;
        SELECT deleted_count;
      `, { saleId, userId, logId: randomUUID(), details: JSON.stringify({ sale_id: saleId }) })
      return Number(rows[0].deleted_count) === 1
    },
  }
}
