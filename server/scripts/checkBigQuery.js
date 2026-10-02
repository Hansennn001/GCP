import { createBigQueryService } from '../services/bigqueryService.js'

try {
  const service = createBigQueryService()
  const rows = await service.query('SELECT @value AS connection_ok', { value: 1 })
  if (rows[0]?.connection_ok !== 1) throw new Error('Unexpected query result')
  console.log('PASS: BigQuery executed a parameterized GoogleSQL query using Application Default Credentials.')
} catch {
  // SDK errors can include request/authentication details; keep this output safe.
  console.error('FAIL: BigQuery connection check. Verify GOOGLE_CLOUD_PROJECT, BIGQUERY_LOCATION, Application Default Credentials, and BigQuery job permissions.')
  process.exitCode = 1
}
