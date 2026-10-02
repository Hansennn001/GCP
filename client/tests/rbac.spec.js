import { test, expect } from '@playwright/test'
import { workspaceFixtures } from './workspaceFixtures'
test.beforeEach(async ({ page }) => workspaceFixtures(page))

const makeUser = role => ({ userId: `TEST_${role}`, name: `Test ${role}`, email: `${role}@example.com`, role, status: 'active' })
async function session(page, user) {
  await page.addInitScript(() => sessionStorage.setItem('sales-insight-token', 'rbac-test-token'))
  await page.route('**/api/auth/me', route => route.fulfill({ json: { success: true, user } }))
}

for (const role of ['admin', 'analyst', 'viewer']) {
  for (const mobile of [false, true]) {
    test(`${role}: navigation, role badge, and transaction actions on ${mobile ? 'mobile' : 'desktop'}`, async ({ page }) => {
      if (mobile) await page.setViewportSize({ width: 390, height: 844 })
      await session(page, makeUser(role))
      await page.goto('/transactions')
      await expect(page.getByLabel('Current role')).toHaveText(role)
      if (mobile) await page.getByRole('button', { name: 'Open navigation' }).click()
      const navigation = page.getByRole('navigation', { name: 'Main navigation' })
      for (const name of ['Dashboard', 'Transactions', 'Analytics']) {
        await expect(navigation.getByRole('link', { name, exact: true })).toBeVisible()
      }
      for (const name of ['Users', 'Audit Logs']) {
        await expect(navigation.getByRole('link', { name, exact: true })).toHaveCount(role === 'admin' ? 1 : 0)
      }
      const create = page.getByRole('button', { name: 'Create transaction', exact: true })
      const remove = page.getByRole('button', { name: /^Delete transaction / })
      if (role === 'viewer') await expect(create).toHaveCount(0)
      else { await expect(create).toBeVisible(); await expect(create).toBeEnabled() }
      if (role === 'admin') {
        await expect(remove.first()).toBeVisible()
        expect(await remove.count()).toBeGreaterThan(0)
        await expect(remove.first()).toBeEnabled()
      } else await expect(remove).toHaveCount(0)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    })
  }
}

for (const role of ['analyst', 'viewer']) {
  for (const path of ['/users', '/audit-logs']) {
    test(`${role} cannot bypass navigation restrictions through ${path} or reload`, async ({ page }) => {
      await session(page, makeUser(role))
      await page.goto(path)
      await expect(page.getByRole('heading', { name: 'Access restricted' })).toBeVisible()
      await expect(page.getByRole('table')).toHaveCount(0)
      await page.reload()
      await expect(page.getByRole('heading', { name: 'Access restricted' })).toBeVisible()
      await page.getByRole('link', { name: 'Back to dashboard' }).click()
      await expect(page).toHaveURL(/\/dashboard$/)
    })
  }
}

test('Admin can open both administration pages directly', async ({ page }) => {
  await session(page, makeUser('admin'))
  for (const [path, heading] of [['/users', 'Users'], ['/audit-logs', 'Audit Logs']]) {
    await page.goto(path)
    await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible()
    await expect(page.getByRole('table')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Access restricted' })).toHaveCount(0)
  }
})

test('unknown roles fail closed and cannot gain permissions through storage hints', async ({ page }) => {
  await session(page, makeUser('superadmin'))
  await page.addInitScript(() => localStorage.setItem('role', 'admin'))
  await page.goto('/dashboard')
  await expect(page.getByRole('heading', { name: 'Access restricted' })).toBeVisible()
  await expect(page.getByLabel('Current role')).toHaveText('Unknown role')
  await expect(page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link')).toHaveCount(0)
  const results = await page.evaluate(async () => {
    const { can, hasRole } = await import('/src/lib/permissions.js')
    return [can(null, 'users.read'), can({ role: 'admin' }, 'constructor'), can({ role: 'toString' }, 'sales.read'), hasRole({ role: 'superadmin' }, 'superadmin')]
  })
  expect(results).toEqual([false, false, false, false])
})

test('reload uses current server role instead of a previously displayed Admin role', async ({ page }) => {
  let user = makeUser('admin')
  await page.addInitScript(() => sessionStorage.setItem('sales-insight-token', 'rbac-test-token'))
  await page.route('**/api/auth/me', route => route.fulfill({ json: { success: true, user } }))
  await page.goto('/users')
  await expect(page.getByRole('heading', { name: 'Users', exact: true })).toBeVisible()
  user = makeUser('viewer')
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Access restricted' })).toBeVisible()
  await expect(page.getByLabel('Current role')).toHaveText('viewer')
  await expect(page.getByRole('link', { name: 'Users', exact: true })).toHaveCount(0)
})
