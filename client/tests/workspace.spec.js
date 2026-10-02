import { test, expect } from '@playwright/test'
import { workspaceFixtures, testSale, testUsers } from './workspaceFixtures'
async function auth(page, role = 'admin') {
  await page.addInitScript(() => sessionStorage.setItem('sales-insight-token', 'workspace-test-token'))
  await page.route('**/api/auth/me', route => route.fulfill({ json: { success: true, user: testUsers.find(user => user.role === role) } }))
}

test('five core pages render API records and charts, not old mock records', async ({ page }) => {
  await auth(page)
  await workspaceFixtures(page, { logs: [{ logId: 'API_LOG', userId: 'TEST_admin', action: 'UPDATE_ROLE', resource: 'users', details: '{"user_id":"TEST_viewer"}', createdAt: '2026-10-02T00:00:00Z' }] })
  await page.goto('/dashboard')
  await expect(page.getByText('API Product', { exact: true }).first()).toBeVisible()
  await expect(page.getByRole('table', { name: 'Recent transactions' })).toContainText('API Product')
  await page.goto('/analytics')
  await page.getByText('View chart data').nth(1).click()
  await expect(page.getByRole('table', { name: 'Revenue by Product data in Indonesian rupiah' })).toContainText('API Product')
  await page.goto('/transactions')
  await expect(page.getByRole('table', { name: 'Sales transactions' })).toContainText('TEST_SALE')
  await page.goto('/users')
  await expect(page.getByRole('table', { name: 'Workspace users' })).toContainText('API viewer')
  await page.goto('/audit-logs')
  await expect(page.getByRole('table', { name: 'Workspace audit logs' })).toContainText('TEST_viewer')
})

test('empty API data has meaningful empty states across all core pages', async ({ page }) => {
  await auth(page)
  await workspaceFixtures(page, { sales: [], users: [], logs: [] })
  for (const path of ['/dashboard', '/analytics', '/transactions', '/users', '/audit-logs']) {
    await page.goto(path)
    await expect(page.getByText('No sales data', { exact: true }).first().or(page.getByText('No records found', { exact: true }).first()).first()).toBeVisible()
  }
})

test('read error can retry without fallback mock data', async ({ page }) => {
  await auth(page)
  let failed = true
  await workspaceFixtures(page, { onRequest: async route => {
    if (failed) { await route.fulfill({ status: 500, json: { success: false } }); return true }
    return false
  } })
  await page.goto('/transactions')
  await expect(page.getByRole('alert')).toContainText('Could not load data')
  await expect(page.getByRole('table')).toHaveCount(0)
  failed = false
  await page.getByRole('button', { name: 'Try again' }).click()
  await expect(page.getByRole('table')).toContainText('API Product')
})

test('create submits decimal strings, refreshes the list, and delete requires confirmation', async ({ page }) => {
  await auth(page)
  const sales = []
  let creates = 0, deletes = 0
  await workspaceFixtures(page, { sales, onRequest: async route => {
    if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON()
      expect(body).toEqual({ sale_date: '2026-10-02', product: 'New API Sale', category: 'Cloud', region: 'Jakarta', quantity: 2, revenue: '123.456789123', cost: '10.25' })
      creates++
      sales.push({ ...testSale, ...body, sale_id: 'NEW_SALE' })
      await route.fulfill({ status: 201, json: { success: true, sale: sales[0] } }); return true
    }
    if (route.request().method() === 'DELETE') { deletes++; sales.splice(0); await route.fulfill({ status: 204 }); return true }
    return false
  } })
  await page.goto('/transactions')
  await page.getByRole('button', { name: 'Create transaction', exact: true }).click()
  const dialog = page.getByRole('dialog')
  for (const [label, value] of [['Sale date', '2026-10-02'], ['Product', 'New API Sale'], ['Category', 'Cloud'], ['Region', 'Jakarta'], ['Quantity', '2'], ['Revenue (IDR)', '123.456789123'], ['Cost (IDR)', '10.25']]) await dialog.getByLabel(label, { exact: true }).fill(value)
  await dialog.getByRole('button', { name: 'Save transaction' }).click()
  await expect(dialog).toHaveCount(0)
  await expect(page.getByRole('table')).toContainText('New API Sale')
  expect(creates).toBe(1)
  await page.getByRole('button', { name: 'Delete transaction NEW_SALE', exact: true }).click()
  expect(deletes).toBe(0)
  await page.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click()
  expect(deletes).toBe(0)
  await page.getByRole('button', { name: 'Delete transaction NEW_SALE', exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Delete transaction', exact: true }).click()
  await expect(page.getByText('No records found', { exact: true })).toBeVisible()
  expect(deletes).toBe(1)
})

test('role editing refreshes users and an API rejection leaves the dialog usable', async ({ page }) => {
  await auth(page)
  const users = testUsers.map(user => ({ ...user }))
  let fail = true
  await workspaceFixtures(page, { users, onRequest: async route => {
    if (route.request().method() !== 'PATCH') return false
    expect(route.request().postDataJSON()).toEqual({ role: 'analyst' })
    if (fail) await route.fulfill({ status: 500, json: { success: false } })
    else { users[2].role = 'analyst'; await route.fulfill({ json: { success: true, user: users[2] } }) }
    return true
  } })
  await page.goto('/users')
  await page.getByRole('button', { name: 'Change role for API viewer', exact: true }).click()
  await page.getByLabel('New role').selectOption('analyst')
  await page.getByRole('button', { name: 'Save role' }).click()
  await expect(page.getByRole('alert')).toContainText('Could not update')
  fail = false
  await page.getByRole('button', { name: 'Save role' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByRole('row').filter({ hasText: 'API viewer' })).toContainText('analyst')
})

test('pagination requests the next API page and current-page search does not alter the dataset', async ({ page }) => {
  await auth(page, 'viewer')
  const sales = Array.from({ length: 51 }, (_, index) => ({ ...testSale, sale_id: `ROW_${index}`, product: `Product ${index}` }))
  await workspaceFixtures(page, { sales })
  await page.goto('/transactions')
  await expect(page.getByRole('table')).toContainText('ROW_0')
  await page.getByRole('button', { name: 'Next', exact: true }).click()
  await expect(page.getByRole('table')).toContainText('ROW_50')
  await expect(page.getByRole('table')).not.toContainText('ROW_0')
  await page.getByLabel('Search this page').fill('no-match')
  await expect(page.getByText('No records found', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Previous', exact: true }).click()
  await expect(page.getByRole('table')).toContainText('ROW_0')
  expect(sales.length).toBe(51)
})

test('pending API reads show loading and replace it with server data', async ({ page }) => {
  await auth(page)
  let release
  const gate = new Promise(resolve => { release = resolve })
  await workspaceFixtures(page, { onRequest: async route => {
    if (new URL(route.request().url()).pathname === '/api/sales') await gate
    return false
  } })
  await page.goto('/transactions')
  await expect(page.getByText('Loading workspace data…', { exact: true })).toBeVisible()
  await expect(page.getByRole('table')).toHaveCount(0)
  release()
  await expect(page.getByRole('table')).toContainText('API Product')
})

test('rejected create/delete show errors without false success or changing the list', async ({ page }) => {
  await auth(page)
  await workspaceFixtures(page, { onRequest: async route => {
    if (route.request().method() === 'GET') return false
    await route.fulfill({ status: 403, json: { success: false } }); return true
  } })
  await page.goto('/transactions')
  await page.getByRole('button', { name: 'Create transaction', exact: true }).click()
  const dialog = page.getByRole('dialog')
  for (const [label, value] of [['Sale date', '2026-10-02'], ['Product', 'Denied Sale'], ['Category', 'Cloud'], ['Region', 'Jakarta'], ['Quantity', '1'], ['Revenue (IDR)', '10'], ['Cost (IDR)', '1']]) await dialog.getByLabel(label, { exact: true }).fill(value)
  await dialog.getByRole('button', { name: 'Save transaction' }).click()
  await expect(dialog.getByRole('alert')).toContainText('does not allow')
  await dialog.getByRole('button', { name: 'Cancel' }).click()
  await page.getByRole('button', { name: 'Delete transaction TEST_SALE', exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Delete transaction', exact: true }).click()
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('does not allow')
  await page.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click()
  await expect(page.getByRole('table')).toContainText('TEST_SALE')
  await expect(page.getByText('Transaction deleted.', { exact: true })).toHaveCount(0)
})

test('changing your own role revalidates the session and removes Admin page access', async ({ page }) => {
  const current = { ...testUsers[0] }
  await page.addInitScript(() => sessionStorage.setItem('sales-insight-token', 'workspace-test-token'))
  await page.route('**/api/auth/me', route => route.fulfill({ json: { success: true, user: current } }))
  await workspaceFixtures(page, { users: [current], onRequest: async route => {
    if (route.request().method() !== 'PATCH') return false
    current.role = route.request().postDataJSON().role
    await route.fulfill({ json: { success: true, user: current } }); return true
  } })
  await page.goto('/users')
  await page.getByRole('button', { name: 'Change role for API admin', exact: true }).click()
  await page.getByLabel('New role').selectOption('viewer')
  await page.getByRole('button', { name: 'Save role' }).click()
  await expect(page.getByRole('heading', { name: 'Access restricted' })).toBeVisible()
  await expect(page.getByLabel('Current role')).toHaveText('viewer')
})
