import { execFileSync, spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { chromium, expect } from '../../client/node_modules/@playwright/test/index.mjs'
import { permissionRoles } from '../../server/config/permissions.js'

// Read-only validation. Google/app tokens and Keychain passwords stay in memory.
const project = 'id-fpoc-0608-data-posindo'
const service = 'sales-insight-dashboard'
const region = 'asia-southeast2'
const root = fileURLToPath(new URL('../../', import.meta.url))
function command(binary, args) {
  try { return execFileSync(binary, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim() }
  catch { throw new Error(`${binary} command failed; check authentication/resource access separately`) }
}
const descriptor = JSON.parse(command('gcloud', ['run', 'services', 'describe', service, `--project=${project}`, `--region=${region}`, '--format=json']))
const url = descriptor.status.url
if (!descriptor.status.conditions.some(c => c.type === 'Ready' && c.status === 'True')) throw new Error('Revision is not ready')
const idToken = command('gcloud', ['auth', 'print-identity-token'])
const googleHeaders = { 'X-Serverless-Authorization': `Bearer ${idToken}` }
async function request(path, token, body) {
  return fetch(new URL(path, url), {
    headers: { ...googleHeaders, ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
    method: body ? 'POST' : 'GET', body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(60000),
  })
}
async function status(path, expected, token, body) {
  const response = await request(path, token, body)
  if (response.status !== expected) throw new Error(`${path}: expected ${expected}, received ${response.status}`)
  return response
}
function snapshot() {
  const sql = ['users', 'sales', 'audit_logs'].map(table =>
    `SELECT '${table}' AS table_name, COUNT(*) AS row_count, TO_HEX(SHA256(STRING_AGG(TO_JSON_STRING(t), '' ORDER BY TO_JSON_STRING(t)))) AS digest FROM \`${project}.sales_dashboard.${table}\` t`
  ).join(' UNION ALL ') + ' ORDER BY table_name'
  return JSON.parse(command('bq', ['--format=json', 'query', '--use_legacy_sql=false', `--project_id=${project}`, `--location=${region}`, sql]))
}

let browser
try {
  const before = snapshot()
  for (const path of ['/api/health', '/login', '/dashboard']) {
    const response = await fetch(new URL(path, url), { signal: AbortSignal.timeout(30000) })
    if (response.status !== 403) throw new Error(`Unauthenticated ${path} was not denied: ${response.status}`)
  }
  await status('/api/health', 200)
  await status('/api/sales', 401)
  await status('/api/auth/me', 401, 'invalid-token')
  await status('/api/auth/login', 401, undefined, { email: 'viewer@example.com', password: 'invalid-test-password' })
  console.log('PASS: private ingress authentication, health, and app JWT rejection')
  browser = await chromium.launch()
  for (const role of ['admin', 'analyst', 'viewer']) {
    const email = `${role}@example.com`
    const password = command('security', ['find-generic-password', '-s', 'sales-insight-dashboard-demo', '-a', email, '-w'])
    const login = await status('/api/auth/login', 200, undefined, { email, password })
    const session = await login.json()
    if (session.user.role !== role || !session.token) throw new Error(`${role}: invalid login result`)
    const token = session.token
    for (const path of ['/api/auth/me', '/api/dashboard/summary', '/api/dashboard/revenue-trend', '/api/analytics/products', '/api/analytics/regions', '/api/analytics/top-products', '/api/sales?limit=50&offset=0']) {
      const response = await status(path, 200, token)
      if (!(response.headers.get('content-type') || '').includes('application/json')) throw new Error(`${role}: API did not return JSON`)
      await response.json()
    }
    for (const path of ['/api/users', '/api/audit-logs']) await status(path, role === 'admin' ? 200 : 403, token)
    for (const [permission, roles] of Object.entries(permissionRoles)) await status(`/api/access/${permission}`, roles.includes(role) ? 200 : 403, token)
    const context = await browser.newContext({ extraHTTPHeaders: googleHeaders, viewport: { width: 1280, height: 900 } })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', () => errors.push('runtime error'))
    page.on('response', response => { if (response.url().includes('/api/') && response.status() >= 500) errors.push('API server error') })
    await page.addInitScript(() => {
      window.policyViolations = []
      document.addEventListener('securitypolicyviolation', event => window.policyViolations.push(event.violatedDirective))
    })
    await page.goto(`${url}/login`)
    await page.getByLabel('Email address').fill(email)
    await page.getByLabel('Password', { exact: true }).fill(password)
    await page.getByRole('button', { name: 'Sign in', exact: true }).click()
    await expect(page).toHaveURL(/\/dashboard$/, { timeout: 60000 })
    const pages = ['/dashboard', '/transactions', '/analytics', ...(role === 'admin' ? ['/users', '/audit-logs'] : [])]
    for (const path of pages) {
      const response = await page.goto(`${url}${path}`)
      if (response.status() !== 200) throw new Error(`${role}: page failed`)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible({ timeout: 60000 })
      if (path === '/dashboard' || path === '/analytics') await expect(page.getByRole('group', { name: 'Revenue Trend chart', exact: true })).toBeVisible({ timeout: 60000 })
      else await expect(page.getByRole('table')).toBeVisible({ timeout: 60000 })
      if ((await page.evaluate(() => window.policyViolations)).length) throw new Error(`${role}: CSP violation`)
    }
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(`${url}/dashboard`)
    await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible({ timeout: 60000 })
    if (!(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))) throw new Error(`${role}: mobile overflow`)
    if (errors.length) throw new Error(`${role}: browser runtime/API errors`)
    await page.getByRole('button', { name: 'Sign out' }).click()
    await expect(page).toHaveURL(/\/login$/)
    await context.close()
    console.log(`PASS: ${role} real BigQuery login, APIs, 8 RBAC probes, direct React routes, mobile, logout`)
  }
  await browser.close()
  browser = undefined
  const suite = spawnSync('npx', ['playwright', 'test', '--config', 'playwright.cloud-run.config.js'], {
    cwd: `${root}client`, stdio: 'inherit', env: { ...process.env, CLOUD_RUN_URL: url, CLOUD_RUN_ID_TOKEN: idToken },
  })
  if (suite.status !== 0) throw new Error('Cloud Run browser fixture suite failed')
  const after = snapshot()
  if (JSON.stringify(before) !== JSON.stringify(after)) throw new Error('Application table counts/digests changed during validation')
  console.log('PASS: before/after table counts and full-row digests unchanged', after.map(row => `${row.table_name}=${row.row_count}`).join(', '))
} catch {
  // Do not print arbitrary browser/subprocess error objects that could contain credentials.
  console.error('Cloud Run validation failed; no credential details emitted. Check the last completed validation group and service health.')
  process.exitCode = 1
} finally {
  await browser?.close()
}
