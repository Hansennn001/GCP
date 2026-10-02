import { test, expect } from '@playwright/test'
import { testUsers, workspaceFixtures } from './workspaceFixtures'

test('Express build loads direct routes, refreshes sessions, and renders charts under CSP', async ({ page }) => {
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.addInitScript(() => {
    sessionStorage.setItem('sales-insight-token', 'production-test-token')
    window.policyViolations = []
    document.addEventListener('securitypolicyviolation', event => window.policyViolations.push(event.violatedDirective))
  })
  await page.route('**/api/auth/me', route => route.fulfill({ json: { success: true, user: testUsers[0] } }))
  await workspaceFixtures(page)
  for (const path of ['/dashboard', '/analytics', '/transactions', '/users', '/audit-logs']) {
    const response = await page.goto(path)
    expect(response.status()).toBe(200)
    expect(response.headers()['content-security-policy']).toContain("connect-src 'self'")
    expect(response.headers()['cache-control']).toBe('no-cache')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await page.reload()
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible()
    if (path === '/dashboard' || path === '/analytics') {
      await expect(page.getByRole('group', { name: 'Revenue Trend chart', exact: true })).toBeVisible()
    } else {
      await expect(page.getByRole('table')).toBeVisible()
    }
    expect(await page.evaluate(() => window.policyViolations)).toEqual([])
  }
  const scriptPath = await page.locator('script[type="module"]').getAttribute('src')
  const asset = await page.request.get(scriptPath)
  expect(asset.status()).toBe(200)
  expect(asset.headers()['content-type']).toContain('javascript')
  expect(asset.headers()['cache-control']).toContain('immutable')
  expect(scriptPath).toMatch(/^\/assets\//)
  expect(errors).toEqual([])
})

test('production server keeps health, API failures, and missing assets outside SPA fallback', async ({ request }) => {
  const health = await request.get('/api/health')
  expect(health.status()).toBe(200)
  expect(await health.json()).toEqual({ status: 'ok', service: 'sales-insight-dashboard' })
  for (const path of ['/api/missing', '/assets/not-built.js', '/.env']) {
    const response = await request.get(path, { headers: { Accept: 'text/html' } })
    expect(response.status()).toBe(404)
    expect(await response.json()).toEqual({ success: false, message: 'Not found' })
  }
  const sales = await request.get('/api/sales')
  expect(sales.status()).toBe(401)
  expect(sales.headers()['content-type']).toContain('application/json')
})
