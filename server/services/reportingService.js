import env from '../config/env.js'
import { createBigQueryService } from './bigqueryService.js'

export function createReportingService(queryService) {
  function salesTable() {
    const { projectId, dataset } = env.bigquery
    if (!/^[a-z][a-z0-9-]+$/.test(projectId) || !/^[A-Za-z0-9_]+$/.test(dataset)) {
      throw new Error('Invalid BigQuery reporting table configuration')
    }
    return `\`${projectId}.${dataset}.sales\``
  }
  const query = (sql) => (queryService ?? createBigQueryService()).query(sql)
  const metrics = `CAST(SUM(revenue) AS FLOAT64) AS revenue, COUNT(*) AS orders, SUM(quantity) AS quantity`

  return {
    async summary() {
      const table = salesTable()
      const rows = await query(`SELECT
        CAST(COALESCE(SUM(revenue), 0) AS FLOAT64) AS totalRevenue,
        COUNT(*) AS totalOrders,
        CAST(COALESCE(AVG(revenue), 0) AS FLOAT64) AS averageOrderValue,
        (SELECT product FROM ${table} GROUP BY product
          ORDER BY SUM(revenue) DESC, product ASC LIMIT 1) AS topProduct
        FROM ${table}`)
      return rows[0]
    },
    async revenueTrend() {
      return query(`SELECT FORMAT_DATE('%Y-%m', sale_date) AS month,
        CAST(SUM(revenue) AS FLOAT64) AS revenue, COUNT(*) AS orders
        FROM ${salesTable()} GROUP BY month ORDER BY month ASC`)
    },
    async products() {
      return query(`SELECT product, ${metrics} FROM ${salesTable()}
        GROUP BY product ORDER BY SUM(revenue) DESC, product ASC`)
    },
    async regions() {
      return query(`SELECT region, ${metrics} FROM ${salesTable()}
        GROUP BY region ORDER BY SUM(revenue) DESC, region ASC`)
    },
    async topProducts() {
      return query(`SELECT product, ${metrics} FROM ${salesTable()}
        GROUP BY product ORDER BY SUM(revenue) DESC, product ASC LIMIT 5`)
    },
  }
}
