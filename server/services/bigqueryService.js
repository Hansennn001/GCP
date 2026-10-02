import { getBigQueryClient } from '../config/bigquery.js'
import env from '../config/env.js'

export function createBigQueryService(client = getBigQueryClient(), location = env.bigquery.location) {
  return {
    async query(query, params = {}) {
      const [rows] = await client.query({ query, params, location, useLegacySql: false })
      return rows
    },
  }
}
