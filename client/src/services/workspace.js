import { apiRequest } from './api'

export const listSales = (offset = 0, signal, limit = 50) => apiRequest(`/sales?limit=${limit}&offset=${offset}`, { signal })
export const listUsers = (offset = 0, signal) => apiRequest(`/users?limit=50&offset=${offset}`, { signal })
export const listLogs = (offset = 0, signal) => apiRequest(`/audit-logs?limit=50&offset=${offset}`, { signal })
export const createSale = body => apiRequest('/sales', { method: 'POST', body })
export const deleteSale = id => apiRequest(`/sales/${encodeURIComponent(id)}`, { method: 'DELETE' })
export const updateRole = (id, role) => apiRequest(`/users/${encodeURIComponent(id)}/role`, { method: 'PATCH', body: { role } })

export async function loadDashboard(signal) {
  const [summary, trend, top, sales] = await Promise.all([
    apiRequest('/dashboard/summary', { signal }), apiRequest('/dashboard/revenue-trend', { signal }),
    apiRequest('/analytics/top-products', { signal }), listSales(0, signal, 5),
  ])
  return { summary: summary.summary, trend: trend.trend, products: top.products, sales: sales.sales }
}
export async function loadAnalytics(signal) {
  const [trend, products, regions, top] = await Promise.all([
    apiRequest('/dashboard/revenue-trend', { signal }), apiRequest('/analytics/products', { signal }),
    apiRequest('/analytics/regions', { signal }), apiRequest('/analytics/top-products', { signal }),
  ])
  return { trend: trend.trend, products: products.products, regions: regions.regions, top: top.products }
}
