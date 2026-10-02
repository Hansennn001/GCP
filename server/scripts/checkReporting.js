import assert from 'node:assert/strict'
import { once } from 'node:events'
import app from '../app.js'
import env from '../config/env.js'
import { createBigQueryService } from '../services/bigqueryService.js'
import { createReportingService } from '../services/reportingService.js'
import { createUserService } from '../services/userService.js'
import { createTokenService } from '../services/tokenService.js'
import { generateSales } from './seedData.js'

async function main() {
  // Explicit manual integration check for this app's seeded dataset, not a default unit test.
  assert.equal(env.bigquery.projectId, 'id-fpoc-0608-data-posindo')
  assert.equal(env.bigquery.dataset, 'sales_dashboard')
  const query = createBigQueryService()
  const users = createUserService()
  const tokens = createTokenService()
  const snapshotSql = `SELECT
   (SELECT COUNT(*) FROM \`id-fpoc-0608-data-posindo.sales_dashboard.sales\`) sales,
   (SELECT COUNT(*) FROM \`id-fpoc-0608-data-posindo.sales_dashboard.users\`) users,
   (SELECT COUNT(*) FROM \`id-fpoc-0608-data-posindo.sales_dashboard.audit_logs\`) audit_logs,
   (SELECT TO_HEX(SHA256(STRING_AGG(TO_JSON_STRING(s), '' ORDER BY sale_id))) FROM \`id-fpoc-0608-data-posindo.sales_dashboard.sales\` s) sales_digest,
   (SELECT TO_HEX(SHA256(STRING_AGG(TO_JSON_STRING(u), '' ORDER BY user_id))) FROM \`id-fpoc-0608-data-posindo.sales_dashboard.users\` u) user_digest,
   (SELECT TO_HEX(SHA256(STRING_AGG(TO_JSON_STRING(a), '' ORDER BY log_id))) FROM \`id-fpoc-0608-data-posindo.sales_dashboard.audit_logs\` a) audit_digest`
  const before = await query.query(snapshotSql)
  const seed = generateSales()
  // Independent expected calculations are only for validation, never used by API handlers.
  function grouped(key) {
    const groups = new Map()
    for (const row of seed) {
      const label = key === 'month' ? row.sale_date.slice(0, 7) : row[key]
      const item = groups.get(label) ?? { [key]: label, revenue: 0, orders: 0, ...(key === 'month' ? {} : { quantity: 0 }) }
      item.revenue += row.revenue
      item.orders++
      if (key !== 'month') item.quantity += row.quantity
      groups.set(label, item)
    }
    return [...groups.values()].sort((a, b) => key === 'month'
      ? a.month.localeCompare(b.month) : b.revenue - a.revenue || a[key].localeCompare(b[key]))
  }
  const products = grouped('product'), regions = grouped('region'), trend = grouped('month')
  const totalRevenue = seed.reduce((sum, row) => sum + row.revenue, 0)
  const expectedSummary = { totalRevenue, totalOrders: seed.length, averageOrderValue: totalRevenue / seed.length, topProduct: products[0].product }
  const endpoints = [
    ['/dashboard/summary', 'summary', expectedSummary], ['/dashboard/revenue-trend', 'trend', trend],
    ['/analytics/products', 'products', products], ['/analytics/regions', 'regions', regions],
    ['/analytics/top-products', 'products', products.slice(0, 5)],
  ]
  const server = app.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const url = `http://127.0.0.1:${server.address().port}`
  try {
    for (const role of ['admin', 'analyst', 'viewer']) {
      const user = await users.findById(`DEMO_${role.toUpperCase()}`)
      assert.equal(user?.role, role)
      assert.equal(user.status, 'active')
      // Generate local demo tokens in memory with the configured secret; do not log them.
      const token = tokens.sign(user)
      for (const [path, key, expected] of endpoints) {
        const response = await fetch(`${url}/api${path}`, { headers: { Authorization: `Bearer ${token}` } })
        assert.equal(response.status, 200, `${role}: ${path}`)
        const body = await response.json()
        if (key === 'summary') {
          assert.ok(Math.abs(body.summary.averageOrderValue - expected.averageOrderValue) < 0.0001)
          body.summary.averageOrderValue = expected.averageOrderValue
        }
        assert.deepEqual(body, { success: true, [key]: expected })
      }
      console.log(`PASS: ${role} five live reports match independent seed aggregates`)
    }
    for (const [path] of endpoints) {
      for (const headers of [{}, { Authorization: 'Bearer invalid' }]) {
        assert.equal((await fetch(`${url}/api${path}`, { headers })).status, 401)
      }
    }
    const target = '`id-fpoc-0608-data-posindo.sales_dashboard.sales`'
    function fixtures(source) {
      return createReportingService({ query(sql) { return query.query(sql.split(target).join(source)) } })
    }
    // Inline SELECT fixtures execute the actual SQL without creating or modifying cloud tables.
    const empty = fixtures('(SELECT CAST(NULL AS STRING) product, CAST(NULL AS STRING) region, CAST(NULL AS DATE) sale_date, CAST(NULL AS INT64) quantity, CAST(NULL AS NUMERIC) revenue FROM UNNEST([1]) WHERE FALSE)')
    assert.deepEqual(await empty.summary(), { totalRevenue: 0, totalOrders: 0, averageOrderValue: 0, topProduct: null })
    for (const method of ['revenueTrend', 'products', 'regions', 'topProducts']) assert.deepEqual(await empty[method](), [])
    const tie = fixtures("(SELECT * FROM UNNEST([STRUCT('A' AS product, 'Jakarta' AS region, DATE '2026-02-01' AS sale_date, 2 AS quantity, NUMERIC '100' AS revenue), STRUCT('Z', 'Bandung', DATE '2026-01-01', 3, NUMERIC '100'), STRUCT('B', 'Jakarta', DATE '2026-01-02', 1, NUMERIC '0')]))")
    assert.equal((await tie.summary()).topProduct, 'A')
    assert.deepEqual((await tie.topProducts()).map(row => row.product), ['A', 'Z', 'B'])
    assert.deepEqual(await tie.revenueTrend(), [{ month: '2026-01', revenue: 100, orders: 2 }, { month: '2026-02', revenue: 100, orders: 1 }])
    assert.deepEqual(await tie.regions(), [{ region: 'Bandung', revenue: 100, orders: 1, quantity: 3 }, { region: 'Jakarta', revenue: 100, orders: 2, quantity: 3 }])
    const precision = fixtures("(SELECT * FROM UNNEST([STRUCT('A' AS product, 'Jakarta' AS region, DATE '2026-01-01' AS sale_date, 1 AS quantity, NUMERIC '10000000000000000.001' AS revenue), STRUCT('Z', 'Bandung', DATE '2026-01-01', 1, NUMERIC '10000000000000000.002')]))")
    assert.equal((await precision.summary()).topProduct, 'Z')
    assert.deepEqual((await precision.topProducts()).map(row => row.product), ['Z', 'A'])
    assert.deepEqual((await precision.products()).map(row => row.product), ['Z', 'A'])
    assert.deepEqual((await precision.regions()).map(row => row.region), ['Bandung', 'Jakarta'])
    console.log('PASS: actual BigQuery empty-source aggregation, ties, month ordering and exact NUMERIC ranking')
    assert.deepEqual(await query.query(snapshotSql), before)
    assert.equal((await fetch(`${url}/api/health`)).status, 200)
    console.log('PASS: missing/invalid JWTs rejected; all table counts and row digests unchanged')
    console.log(JSON.stringify({ summary: expectedSummary, users: before[0].users, sales: before[0].sales, audit_logs: before[0].audit_logs }))
  } finally {
    await new Promise(resolve => server.close(resolve))
  }

}

// Never dump SDK errors: they can contain authenticated request metadata.
main().catch(error => {
  console.error(`FAIL: reporting validation (${error.code ?? error.name ?? 'unknown error'})`)
  process.exitCode = 1
})
