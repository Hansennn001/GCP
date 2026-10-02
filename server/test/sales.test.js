import assert from 'node:assert/strict'
import { once } from 'node:events'
import { before, after, test } from 'node:test'
import { createApp } from '../app.js'
import { createTokenService } from '../services/tokenService.js'
import { createSalesService } from '../services/salesService.js'
import { validateSale } from '../utils/salesValidation.js'

const tokens = createTokenService('sales-test-only-secret-of-at-least-32-bytes')
const users = { async findById(id) { return { user_id: id, role: id, status: 'active' } } }
const saleInput = { sale_date: '2026-10-02', product: 'Test Product', category: 'Test', region: 'Jakarta', quantity: 2, revenue: '1234.567890123', cost: '500.25' }
const rows = new Map()
const audits = []
let calls = 0
const sales = {
  async list({ limit, offset }) { calls++; return [...rows.values()].slice(offset, offset + limit) },
  async create(input, userId) {
    calls++
    const sale = { ...input, sale_id: `TEST_${rows.size}`, created_by: userId, created_at: '2026-10-02T00:00:00Z' }
    rows.set(sale.sale_id, sale)
    audits.push({ action: 'CREATE_SALE', userId, saleId: sale.sale_id })
    return sale
  },
  async remove(id, userId) {
    calls++
    if (id === 'database-error') throw new Error('private database error')
    if (!rows.delete(id)) return false
    audits.push({ action: 'DELETE_SALE', userId, saleId: id })
    return true
  },
}
let server, baseUrl
before(async () => {
  server = createApp({ users, tokens, sales }).listen(0, '127.0.0.1')
  await once(server, 'listening')
  baseUrl = `http://127.0.0.1:${server.address().port}`
})
after(() => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())))
function request(role, method = 'GET', suffix = '', body) {
  return fetch(`${baseUrl}/api/sales${suffix}`, {
    method, headers: { ...(role ? { Authorization: `Bearer ${tokens.sign({ user_id: role, email: `${role}@example.com`, role })}` } : {}), 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
}

test('all three roles list sales; Admin and Analyst create with server-owned identity', async () => {
  for (const role of ['admin', 'analyst']) {
    const response = await request(role, 'POST', '', saleInput)
    assert.equal(response.status, 201)
    const body = await response.json()
    assert.equal(body.sale.created_by, role)
    assert.equal(body.sale.revenue, saleInput.revenue)
    assert.equal(audits.at(-1).action, 'CREATE_SALE')
  }
  for (const role of ['admin', 'analyst', 'viewer']) {
    const response = await request(role)
    assert.equal(response.status, 200)
    const body = await response.json()
    assert.equal(body.sales.length, 2)
    assert.deepEqual(body.pagination, { limit: 50, offset: 0 })
  }
  const page = await request('viewer', 'GET', '?limit=1&offset=1')
  assert.equal((await page.json()).sales.length, 1)
})

test('Viewer cannot create, Analyst/Viewer cannot delete; forbidden calls do not reach sales service', async () => {
  const beforeCalls = calls
  assert.equal((await request('viewer', 'POST', '', saleInput)).status, 403)
  for (const role of ['analyst', 'viewer']) assert.equal((await request(role, 'DELETE', '/TEST_0')).status, 403)
  assert.equal(calls, beforeCalls)
})

test('all sales methods require a valid JWT', async () => {
  const beforeCalls = calls
  for (const [method, suffix] of [['GET', ''], ['POST', ''], ['DELETE', '/TEST_0']]) {
    assert.equal((await request(undefined, method, suffix)).status, 401)
    assert.equal((await fetch(`${baseUrl}/api/sales${suffix}`, { method, headers: { Authorization: 'Bearer invalid' } })).status, 401)
  }
  assert.equal(calls, beforeCalls)
})

test('invalid input and pagination fail before mutations or reads', async () => {
  const beforeCalls = calls
  for (const body of [null, [], {}, { ...saleInput, sale_date: '2026-02-30' }, { ...saleInput, sale_date: '0000-01-01' },
    { ...saleInput, quantity: 0 }, { ...saleInput, quantity: 1.5 }, { ...saleInput, quantity: Number.MAX_SAFE_INTEGER + 1 },
    { ...saleInput, revenue: '-1' }, { ...saleInput, cost: '1e3' }, { ...saleInput, revenue: '1.1234567890' },
    { ...saleInput, revenue: '1'.repeat(30) }, { ...saleInput, product: '  ' }, { ...saleInput, region: 'x'.repeat(151) },
    { ...saleInput, created_by: 'admin' }, { ...saleInput, sale_id: 'forged' }]) {
    assert.equal((await request('admin', 'POST', '', body)).status, 400)
  }
  for (const query of ['limit=0', 'limit=101', 'offset=-1', 'limit=1.5', 'limit=1&limit=2', 'offset=1000001']) {
    assert.equal((await request('viewer', 'GET', `?${query}`)).status, 400)
  }
  assert.equal((await request('admin', 'DELETE', '/bad%20id')).status, 400)
  assert.equal(calls, beforeCalls)
  assert.equal(validateSale({ ...saleInput, revenue: 0, cost: 1 }).revenue, '0')
  assert.equal(validateSale({ ...saleInput, sale_date: '2024-02-29' }).sale_date, '2024-02-29')
})

test('Admin deletes with 204; missing sale gives 404 without an extra audit', async () => {
  const response = await request('admin', 'DELETE', '/TEST_0')
  assert.equal(response.status, 204)
  assert.equal(await response.text(), '')
  assert.deepEqual(audits.at(-1), { action: 'DELETE_SALE', userId: 'admin', saleId: 'TEST_0' })
  const count = audits.length
  const missing = await request('admin', 'DELETE', '/TEST_0')
  assert.equal(missing.status, 404)
  assert.deepEqual(await missing.json(), { success: false, message: 'Sale not found' })
  assert.equal(audits.length, count)
})

test('sales database failures return sanitized errors', async () => {
  const response = await request('admin', 'DELETE', '/database-error')
  assert.equal(response.status, 500)
  assert.deepEqual(await response.json(), { success: false, message: 'Internal server error' })
})

test('BigQuery sales service parameterizes input and pairs mutations/audits in one transaction', async () => {
  const queries = []
  const service = createSalesService({ async query(sql, params) {
    queries.push({ sql, params })
    if (sql.includes('SELECT deleted_count')) return [{ deleted_count: 1 }]
    return [{ sale_id: params.saleId }]
  } })
  await service.list({ limit: 50, offset: 0 })
  assert.match(queries[0].sql, /LIMIT @limit OFFSET @offset/)
  const malicious = "x'); DELETE FROM users; --"
  const created = await service.create({ ...saleInput, product: malicious }, 'analyst')
  const create = queries[1]
  assert.equal(create.params.product, malicious)
  assert.equal(create.sql.includes(malicious), false)
  assert.match(create.sql, /BEGIN TRANSACTION/)
  assert.match(create.sql, /CREATE_SALE/)
  assert.match(create.sql, /COMMIT TRANSACTION/)
  assert.match(created.sale_id, /^SALE_/)
  assert.equal(JSON.parse(create.params.details).sale_id, created.sale_id)
  assert.equal(await service.remove(created.sale_id, 'admin'), true)
  const remove = queries[2]
  assert.match(remove.sql, /DELETE FROM .* WHERE sale_id = @saleId/)
  assert.match(remove.sql, /SET deleted_count = @@row_count/)
  assert.match(remove.sql, /IF deleted_count = 1 THEN/)
  assert.match(remove.sql, /DELETE_SALE/)
  assert.match(remove.sql, /COMMIT TRANSACTION/)
  const missing = createSalesService({ async query() { return [{ deleted_count: 0 }] } })
  assert.equal(await missing.remove('missing', 'admin'), false)
  const failure = createSalesService({ async query() { throw new Error('transaction failed') } })
  await assert.rejects(failure.create(saleInput, 'admin'), /transaction failed/)
})
