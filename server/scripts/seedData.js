export const demoUsers = [
  { user_id: 'DEMO_ADMIN', name: 'Demo Admin', email: 'admin@example.com', role: 'admin', status: 'active', created_at: '2026-04-01T02:00:00Z', passwordVariable: 'SEED_ADMIN_PASSWORD' },
  { user_id: 'DEMO_ANALYST', name: 'Demo Analyst', email: 'analyst@example.com', role: 'analyst', status: 'active', created_at: '2026-04-01T02:00:00Z', passwordVariable: 'SEED_ANALYST_PASSWORD' },
  { user_id: 'DEMO_VIEWER', name: 'Demo Viewer', email: 'viewer@example.com', role: 'viewer', status: 'active', created_at: '2026-04-01T02:00:00Z', passwordVariable: 'SEED_VIEWER_PASSWORD' },
]

const products = [
  { product: 'Google Workspace', category: 'Productivity', price: 500000, costRatio: 0.6 },
  { product: 'Cloud Migration', category: 'Cloud', price: 32000000, costRatio: 0.62 },
  { product: 'Managed Service', category: 'Operations', price: 9000000, costRatio: 0.58 },
  { product: 'Data Analytics', category: 'Data', price: 22000000, costRatio: 0.55 },
  { product: 'Security Assessment', category: 'Security', price: 15000000, costRatio: 0.53 },
  { product: 'App Modernization', category: 'Development', price: 42000000, costRatio: 0.65 },
]
const regions = ['Jakarta', 'Bandung', 'Surabaya', 'Medan', 'Bali']

export function generateSales() {
  let state = 20261002
  const random = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return state / 4294967296
  }
  return Array.from({ length: 750 }, (_, index) => {
    const item = products[Math.floor(random() * products.length)]
    const region = regions[Math.floor(random() * regions.length)]
    const quantity = item.product === 'Google Workspace' ? 10 + Math.floor(random() * 71) : 1 + Math.floor(random() * 3)
    const revenue = Math.round(item.price * quantity * (0.9 + random() * 0.2) / 1000) * 1000
    const cost = Math.round(revenue * item.costRatio / 1000) * 1000
    const day = Math.floor(random() * 183)
    const saleDate = new Date(Date.UTC(2026, 3, 1 + day)).toISOString().slice(0, 10)
    return {
      sale_id: `DEMO_SALE_${String(index + 1).padStart(4, '0')}`,
      sale_date: saleDate, product: item.product, category: item.category, region,
      quantity, revenue, cost, created_by: random() < 0.3 ? 'DEMO_ADMIN' : 'DEMO_ANALYST',
      created_at: `${saleDate}T03:00:00Z`,
    }
  })
}
