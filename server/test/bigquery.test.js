import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createBigQueryClient } from '../config/bigquery.js'
import { createBigQueryService } from '../services/bigqueryService.js'

test('BigQuery service forwards named parameters and location and returns rows', async () => {
  const rows = [{ connection_ok: 1 }]
  let received
  const service = createBigQueryService({
    async query(options) { received = options; return [rows] },
  }, 'asia-southeast2')
  assert.equal(await service.query('SELECT @value AS connection_ok', { value: 1 }), rows)
  assert.deepEqual(received, {
    query: 'SELECT @value AS connection_ok', params: { value: 1 }, location: 'asia-southeast2', useLegacySql: false,
  })
})

test('BigQuery query failures propagate to the caller', async () => {
  const failure = new Error('Query unavailable')
  const service = createBigQueryService({ async query() { throw failure } }, 'US')
  await assert.rejects(service.query('SELECT 1'), (error) => error === failure)
})

test('BigQuery client validates configuration without requiring credentials at startup', () => {
  const config = { projectId: 'id-fpoc-0608-data-posindo', dataset: 'sales_dashboard', location: 'US' }
  const client = createBigQueryClient(config)
  assert.equal(client.projectId, config.projectId)
  assert.throws(() => createBigQueryClient({ ...config, projectId: '' }), /GOOGLE_CLOUD_PROJECT/)
  assert.throws(() => createBigQueryClient({ ...config, dataset: 'unsafe.dataset' }), /BIGQUERY_DATASET/)
  assert.throws(() => createBigQueryClient({ ...config, location: '' }), /BIGQUERY_LOCATION/)
})
