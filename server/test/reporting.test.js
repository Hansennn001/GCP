import assert from 'node:assert/strict'
import { once } from 'node:events'
import { before, after, test } from 'node:test'
import jwt from 'jsonwebtoken'
import { createApp } from '../app.js'
import { createTokenService } from '../services/tokenService.js'

const secret = 'reporting-test-only-secret-at-least-32-bytes'
const tokens = createTokenService(secret)
const users = { async findById(id) {
  if (id === 'removed') return null
  return { user_id: id, role: id === 'inactive' ? 'admin' : id, status: id === 'inactive' ? 'inactive' : 'active' }
} }
const summary = { totalRevenue: 300, totalOrders: 2, averageOrderValue: 150, topProduct: 'Product A' }
const trend = [{ month: '2026-04', revenue: 100, orders: 1 }, { month: '2026-05', revenue: 200, orders: 1 }]
const products = [{ product: 'Product A', revenue: 300, orders: 2, quantity: 4 }]
const regions = [{ region: 'Jakarta', revenue: 300, orders: 2, quantity: 4 }]
let calls = 0, fail = false, empty = false
const result = data => {
  calls++
  if (fail) throw new Error('private BigQuery failure')
  return data
}
const reports = {
  async summary() { return result(empty ? { totalRevenue: 0, totalOrders: 0, averageOrderValue: 0, topProduct: null } : summary) },
  async revenueTrend() { return result(empty ? [] : trend) },
  async products() { return result(empty ? [] : products) },
  async regions() { return result(empty ? [] : regions) },
  async topProducts() { return result(empty ? [] : products) },
}
const endpoints = [
  ['/dashboard/summary', 'summary', summary],
  ['/dashboard/revenue-trend', 'trend', trend],
  ['/analytics/products', 'products', products],
  ['/analytics/regions', 'regions', regions],
  ['/analytics/top-products', 'products', products],
]
let server, baseUrl
before(async () => {
  server = createApp({ users, tokens, reports }).listen(0, '127.0.0.1')
  await once(server, 'listening')
  baseUrl = `http://127.0.0.1:${server.address().port}/api`
})
after(() => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())))
const tokenFor = role => tokens.sign({ user_id: role, role, email: `${role}@example.com` })
const request = (path, token, method = 'GET') => fetch(`${baseUrl}${path}`, { method,
  headers: token ? { Authorization: `Bearer ${token}` } : {},
})

test('all five reports return chart-friendly contracts for Admin, Analyst, and Viewer', async () => {
  for (const role of ['admin', 'analyst', 'viewer']) {
    for (const [path, key, expected] of endpoints) {
      const response = await request(path, tokenFor(role))
      assert.equal(response.status, 200, `${role}: ${path}`)
      assert.equal(response.headers.get('cache-control'), 'no-store')
      assert.deepEqual(await response.json(), { success: true, [key]: expected })
    }
  }
})

test('every report rejects missing, invalid, tampered, and expired tokens before aggregation', async () => {
  const expired = jwt.sign({ userId: 'admin', email: 'admin@example.com', role: 'admin' }, secret, {
    expiresIn: -1, issuer: 'sales-insight-dashboard', audience: 'sales-insight-dashboard-api',
  })
  const beforeCalls = calls
  for (const [path] of endpoints) {
    for (const token of [undefined, 'invalid', `${tokenFor('admin')}x`, expired]) {
      const response = await request(path, token)
      assert.equal(response.status, 401)
      assert.deepEqual(await response.json(), { success: false, message: 'Authentication required' })
    }
  }
  assert.equal(calls, beforeCalls)
})

test('reports reject removed/inactive accounts and unsupported roles without aggregation', async () => {
  const beforeCalls = calls
  for (const [path] of endpoints) {
    for (const [role, expected] of [['removed', 401], ['inactive', 401], ['superadmin', 403]]) {
      assert.equal((await request(path, tokenFor(role))).status, expected)
    }
  }
  assert.equal(calls, beforeCalls)
})

test('empty reports return zero summary and empty chart arrays', async () => {
  empty = true
  try {
    for (const [path, key] of endpoints) {
      const response = await request(path, tokenFor('viewer'))
      assert.equal(response.status, 200)
      assert.deepEqual(await response.json(), { success: true, [key]: key === 'summary'
        ? { totalRevenue: 0, totalOrders: 0, averageOrderValue: 0, topProduct: null } : [] })
    }
  } finally { empty = false }
})

test('aggregation failures return sanitized 500 responses for every endpoint', async () => {
  fail = true
  try {
    for (const [path] of endpoints) {
      const response = await request(path, tokenFor('admin'))
      assert.equal(response.status, 500)
      assert.deepEqual(await response.json(), { success: false, message: 'Internal server error' })
    }
  } finally { fail = false }
})

test('reporting endpoints are read-only and Phase 10 routes remain absent', async () => {
  const beforeCalls = calls
  for (const [path] of endpoints) {
    for (const method of ['POST', 'PATCH', 'DELETE']) {
      assert.equal((await request(path, tokenFor('admin'), method)).status, 404)
    }
  }
  for (const path of ['/users', '/users/DEMO_VIEWER/role', '/audit-logs']) {
    assert.equal((await request(path, tokenFor('admin'))).status, 404)
  }
  assert.equal(calls, beforeCalls)
})
