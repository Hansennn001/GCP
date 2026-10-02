import assert from 'node:assert/strict'
import { test } from 'node:test'
import { demoUsers, generateSales } from '../scripts/seedData.js'

test('seed is deterministic, unique, and covers the reporting period and dimensions', () => {
  const rows = generateSales()
  assert.deepEqual(rows, generateSales())
  assert.equal(rows.length, 750)
  assert.equal(new Set(rows.map((row) => row.sale_id)).size, 750)
  assert.equal(new Set(rows.map((row) => row.product)).size, 6)
  assert.equal(new Set(rows.map((row) => row.region)).size, 5)
  assert.equal(new Set(rows.map((row) => row.sale_date.slice(0, 7))).size, 6)
  for (const row of rows) {
    assert.ok(row.sale_date >= '2026-04-01' && row.sale_date <= '2026-09-30')
    assert.ok(Number.isInteger(row.quantity) && row.quantity > 0)
    assert.ok(Number.isSafeInteger(row.revenue) && row.revenue > 0)
    assert.ok(Number.isSafeInteger(row.cost) && row.cost >= 0 && row.cost < row.revenue)
    assert.ok(['DEMO_ADMIN', 'DEMO_ANALYST'].includes(row.created_by))
    assert.ok(Number.isFinite(Date.parse(row.created_at)))
  }
})

test('three distinct active demo users cover all roles without raw password fields', () => {
  assert.equal(demoUsers.length, 3)
  assert.equal(new Set(demoUsers.map((user) => user.email)).size, 3)
  assert.deepEqual(new Set(demoUsers.map((user) => user.role)), new Set(['admin', 'analyst', 'viewer']))
  assert.ok(demoUsers.every((user) => user.status === 'active' && !Object.hasOwn(user, 'password')))
})
