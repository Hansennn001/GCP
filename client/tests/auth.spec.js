import { test, expect } from '@playwright/test'

const user = { userId: 'TEST_VIEWER', name: 'Test Viewer', email: 'viewer@example.com', role: 'viewer', status: 'active' }
const token = 'test-only-mocked-token'
const key = 'sales-insight-token'
async function successfulApi(page) {
  await page.route('**/api/auth/login', async route => {
    expect(route.request().postDataJSON()).toEqual({ email: user.email, password: 'test-password' })
    await route.fulfill({ json: { success: true, token, user } })
  })
  await page.route('**/api/auth/me', async route => {
    expect(route.request().headers().authorization).toBe(`Bearer ${token}`)
    await route.fulfill({ json: { success: true, user } })
  })
}
async function signIn(page) {
  await page.getByLabel('Email address').fill(user.email)
  await page.getByLabel('Password', { exact: true }).fill('test-password')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
}

test('anonymous deep links redirect; login returns to destination; reload validates; logout clears', async ({ page }) => {
  await successfulApi(page)
  await page.goto('/transactions')
  await expect(page).toHaveURL(/\/login$/)
  await signIn(page)
  await expect(page).toHaveURL(/\/transactions$/)
  await expect(page.getByText(user.name, { exact: true })).toBeVisible()
  expect(await page.evaluate(key => sessionStorage.getItem(key), key)).toBe(token)
  await page.reload()
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible()
  await page.getByRole('button', { name: 'Sign out' }).click()
  await expect(page).toHaveURL(/\/login$/)
  expect(await page.evaluate(key => sessionStorage.getItem(key), key)).toBeNull()
  await page.goto('/dashboard')
  await expect(page).toHaveURL(/\/login$/)
})

test('invalid credentials show an error and do not store a session', async ({ page }) => {
  await page.route('**/api/auth/login', route => route.fulfill({ status: 401, json: { success: false, message: 'Invalid email or password' } }))
  await page.goto('/login')
  await signIn(page)
  await expect(page.getByRole('alert')).toHaveText('Invalid email or password.')
  await expect(page.getByLabel('Password', { exact: true })).toHaveValue('')
  expect(await page.evaluate(key => sessionStorage.getItem(key), key)).toBeNull()
})

test('rejected saved JWT returns to login and removes the token', async ({ page }) => {
  await page.addInitScript(({ key, token }) => sessionStorage.setItem(key, token), { key, token })
  await page.route('**/api/auth/me', route => route.fulfill({ status: 401, json: { success: false } }))
  await page.goto('/dashboard')
  await expect(page).toHaveURL(/\/login$/)
  expect(await page.evaluate(key => sessionStorage.getItem(key), key)).toBeNull()
})

test('session verification failure retains the token for retry and does not expose protected pages', async ({ page }) => {
  await page.addInitScript(({ key, token }) => sessionStorage.setItem(key, token), { key, token })
  let available = false
  await page.route('**/api/auth/me', route => route.fulfill(available
    ? { json: { success: true, user } } : { status: 500, json: { success: false } }))
  await page.goto('/dashboard')
  await expect(page.getByRole('alert')).toContainText('could not verify')
  await expect(page.getByRole('button', { name: 'Sign out' })).toHaveCount(0)
  expect(await page.evaluate(key => sessionStorage.getItem(key), key)).toBe(token)
  available = true
  await page.getByRole('button', { name: 'Try again' }).click()
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible()
})

test('API 401 after login clears the session and redirects', async ({ page }) => {
  await successfulApi(page)
  await page.route('**/api/session-test', route => route.fulfill({ status: 401, json: { success: false } }))
  await page.goto('/login')
  await signIn(page)
  await expect(page).toHaveURL(/\/dashboard$/)
  await page.evaluate(async () => {
    const { apiRequest } = await import('/src/services/api.js')
    await apiRequest('/session-test').catch(() => {})
  })
  await expect(page).toHaveURL(/\/login$/)
  expect(await page.evaluate(key => sessionStorage.getItem(key), key)).toBeNull()
})

test('login and permitted navigation remain usable on narrow screens', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await successfulApi(page)
  await page.goto('/login')
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await signIn(page)
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible()
  await page.getByRole('button', { name: 'Open navigation' }).click()
  await expect(page.getByRole('link', { name: 'Users', exact: true })).toHaveCount(0)
  await page.getByRole('link', { name: 'Transactions', exact: true }).click()
  await expect(page).toHaveURL(/\/transactions$/)
})

test('login network failures display a safe error and permit another attempt', async ({ page }) => {
  await page.route('**/api/auth/login', route => route.abort())
  await page.goto('/login')
  await signIn(page)
  await expect(page.getByRole('alert')).toHaveText('Unable to sign in. Please try again.')
  await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeEnabled()
})
