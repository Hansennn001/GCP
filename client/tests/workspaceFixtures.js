export const testSale = { sale_id: 'TEST_SALE', sale_date: '2026-10-02', product: 'API Product', category: 'Cloud', region: 'Jakarta', quantity: 2, revenue: '1234.567', cost: '500', created_by: 'TEST_admin', created_at: '2026-10-02T00:00:00Z' }
export const testUsers = ['admin', 'analyst', 'viewer'].map(role => ({ userId: `TEST_${role}`, name: `API ${role}`, email: `${role}@example.com`, role, status: 'active', createdAt: '2026-04-01T00:00:00Z' }))
export async function workspaceFixtures(page, { sales = [testSale], users = testUsers, logs = [{ logId: 'TEST_LOG', userId: 'TEST_admin', action: 'CREATE_SALE', resource: 'sales', details: '{}', createdAt: '2026-10-02T00:00:00Z' }], onRequest } = {}) {
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url())
    if (url.pathname.startsWith('/api/auth/')) return route.fallback()
    if (onRequest && await onRequest(route)) return
    const offset = Number(url.searchParams.get('offset') ?? 0)
    const limit = Number(url.searchParams.get('limit') ?? 50)
    const body = {
      '/api/dashboard/summary': { summary: { totalRevenue: sales.reduce((sum, row) => sum + Number(row.revenue), 0), totalOrders: sales.length, averageOrderValue: sales.length ? Number(sales[0].revenue) : 0, topProduct: sales[0]?.product ?? null } },
      '/api/dashboard/revenue-trend': { trend: sales.length ? [{ month: '2026-10', revenue: 1234.567, orders: 1 }] : [] },
      '/api/analytics/products': { products: sales.length ? [{ product: 'API Product', revenue: 1234.567, orders: 1, quantity: 2 }] : [] },
      '/api/analytics/regions': { regions: sales.length ? [{ region: 'Jakarta', revenue: 1234.567, orders: 1, quantity: 2 }] : [] },
      '/api/analytics/top-products': { products: sales.length ? [{ product: 'API Product', revenue: 1234.567, orders: 1, quantity: 2 }] : [] },
      '/api/sales': { sales: sales.slice(offset, offset + limit), pagination: { limit, offset } },
      '/api/users': { users: users.slice(offset, offset + limit), pagination: { limit, offset } },
      '/api/audit-logs': { logs: logs.slice(offset, offset + limit), pagination: { limit, offset } },
    }[url.pathname]
    if (!body) throw new Error(`Unexpected test API request: ${url.pathname}`)
    await route.fulfill({ json: { success: true, ...body } })
  })
}
