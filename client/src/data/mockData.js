// Static frontend fixtures only. No credentials or database seed data.
export const reportingPeriod = 'Apr – Sep 2026'

export const users = [
  { user_id: 'USR001', name: 'Nadia Putri', email: 'nadia@example.com', role: 'admin', status: 'active', created_at: '2026-04-01T02:00:00Z' },
  { user_id: 'USR002', name: 'Arif Pratama', email: 'arif@example.com', role: 'analyst', status: 'active', created_at: '2026-04-03T03:00:00Z' },
  { user_id: 'USR003', name: 'Maya Sari', email: 'maya@example.com', role: 'viewer', status: 'active', created_at: '2026-04-05T04:00:00Z' },
  { user_id: 'USR004', name: 'Dimas Wijaya', email: 'dimas@example.com', role: 'analyst', status: 'active', created_at: '2026-05-12T02:00:00Z' },
  { user_id: 'USR005', name: 'Rina Lestari', email: 'rina@example.com', role: 'viewer', status: 'inactive', created_at: '2026-06-08T03:00:00Z' },
]

export const sales = [
  { sale_id: 'SAL001', sale_date: '2026-04-06', product: 'Google Workspace', category: 'Productivity', region: 'Jakarta', quantity: 24, revenue: 12000000, cost: 7200000, created_by: 'Nadia Putri' },
  { sale_id: 'SAL002', sale_date: '2026-04-14', product: 'Managed Service', category: 'Operations', region: 'Bandung', quantity: 2, revenue: 18000000, cost: 11000000, created_by: 'Arif Pratama' },
  { sale_id: 'SAL003', sale_date: '2026-04-23', product: 'Security Assessment', category: 'Security', region: 'Medan', quantity: 1, revenue: 15000000, cost: 8000000, created_by: 'Nadia Putri' },
  { sale_id: 'SAL004', sale_date: '2026-05-04', product: 'Cloud Migration', category: 'Cloud', region: 'Jakarta', quantity: 1, revenue: 32000000, cost: 19000000, created_by: 'Arif Pratama' },
  { sale_id: 'SAL005', sale_date: '2026-05-15', product: 'Data Analytics', category: 'Data', region: 'Surabaya', quantity: 1, revenue: 22000000, cost: 12000000, created_by: 'Dimas Wijaya' },
  { sale_id: 'SAL006', sale_date: '2026-05-26', product: 'Google Workspace', category: 'Productivity', region: 'Bali', quantity: 36, revenue: 18000000, cost: 10800000, created_by: 'Nadia Putri' },
  { sale_id: 'SAL007', sale_date: '2026-06-05', product: 'App Modernization', category: 'Development', region: 'Bandung', quantity: 1, revenue: 38000000, cost: 23000000, created_by: 'Dimas Wijaya' },
  { sale_id: 'SAL008', sale_date: '2026-06-16', product: 'Managed Service', category: 'Operations', region: 'Surabaya', quantity: 3, revenue: 27000000, cost: 16500000, created_by: 'Arif Pratama' },
  { sale_id: 'SAL009', sale_date: '2026-06-25', product: 'Security Assessment', category: 'Security', region: 'Jakarta', quantity: 1, revenue: 15000000, cost: 8000000, created_by: 'Nadia Putri' },
  { sale_id: 'SAL010', sale_date: '2026-07-06', product: 'Cloud Migration', category: 'Cloud', region: 'Medan', quantity: 1, revenue: 35000000, cost: 21000000, created_by: 'Arif Pratama' },
  { sale_id: 'SAL011', sale_date: '2026-07-17', product: 'Data Analytics', category: 'Data', region: 'Bali', quantity: 2, revenue: 44000000, cost: 24000000, created_by: 'Dimas Wijaya' },
  { sale_id: 'SAL012', sale_date: '2026-07-28', product: 'Google Workspace', category: 'Productivity', region: 'Jakarta', quantity: 48, revenue: 24000000, cost: 14400000, created_by: 'Nadia Putri' },
  { sale_id: 'SAL013', sale_date: '2026-08-07', product: 'App Modernization', category: 'Development', region: 'Surabaya', quantity: 1, revenue: 42000000, cost: 25000000, created_by: 'Dimas Wijaya' },
  { sale_id: 'SAL014', sale_date: '2026-08-18', product: 'Managed Service', category: 'Operations', region: 'Jakarta', quantity: 4, revenue: 36000000, cost: 22000000, created_by: 'Arif Pratama' },
  { sale_id: 'SAL015', sale_date: '2026-08-27', product: 'Security Assessment', category: 'Security', region: 'Bandung', quantity: 2, revenue: 30000000, cost: 16000000, created_by: 'Nadia Putri' },
  { sale_id: 'SAL016', sale_date: '2026-09-08', product: 'Cloud Migration', category: 'Cloud', region: 'Bali', quantity: 2, revenue: 64000000, cost: 38000000, created_by: 'Arif Pratama' },
  { sale_id: 'SAL017', sale_date: '2026-09-19', product: 'Data Analytics', category: 'Data', region: 'Jakarta', quantity: 2, revenue: 48000000, cost: 26000000, created_by: 'Dimas Wijaya' },
  { sale_id: 'SAL018', sale_date: '2026-09-29', product: 'App Modernization', category: 'Development', region: 'Medan', quantity: 1, revenue: 46000000, cost: 28000000, created_by: 'Nadia Putri' },
]

export const auditLogs = [
  { log_id: 'LOG006', user: 'Nadia Putri', action: 'CREATE_SALE', resource: 'SAL018', details: 'Created an App Modernization transaction.', created_at: '2026-09-29T03:30:00Z' },
  { log_id: 'LOG005', user: 'Nadia Putri', action: 'UPDATE_ROLE', resource: 'USR003', details: 'Changed Maya Sari from analyst to viewer.', created_at: '2026-09-24T07:15:00Z' },
  { log_id: 'LOG004', user: 'Arif Pratama', action: 'LOGIN', resource: 'Session', details: 'Signed in to the workspace.', created_at: '2026-09-22T02:05:00Z' },
  { log_id: 'LOG003', user: 'Dimas Wijaya', action: 'CREATE_SALE', resource: 'SAL017', details: 'Created a Data Analytics transaction.', created_at: '2026-09-19T04:45:00Z' },
  { log_id: 'LOG002', user: 'Nadia Putri', action: 'DELETE_SALE', resource: 'SAL019', details: 'Removed a duplicate transaction.', created_at: '2026-09-15T06:20:00Z' },
  { log_id: 'LOG001', user: 'Maya Sari', action: 'LOGIN', resource: 'Session', details: 'Signed in to the workspace.', created_at: '2026-09-12T01:30:00Z' },
]

// All views derive from the same static records to keep their totals consistent.
function groupSales(key) {
  const groups = new Map()
  for (const sale of sales) {
    const name = sale[key]
    const group = groups.get(name) ?? { name, revenue: 0, quantity: 0, orders: 0 }
    group.revenue += sale.revenue
    group.quantity += sale.quantity
    group.orders += 1
    groups.set(name, group)
  }
  return [...groups.values()].sort((a, b) => b.revenue - a.revenue)
}

export const productRevenue = groupSales('product')
export const regionRevenue = groupSales('region')
export const topProducts = productRevenue.slice(0, 5)
export const revenueTrend = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'].map((month, index) => ({
  month,
  revenue: sales.filter((sale) => Number(sale.sale_date.slice(5, 7)) === index + 4).reduce((total, sale) => total + sale.revenue, 0),
}))
export const summary = {
  totalRevenue: sales.reduce((total, sale) => total + sale.revenue, 0),
  totalOrders: sales.length,
  averageOrderValue: sales.reduce((total, sale) => total + sale.revenue, 0) / sales.length,
  topProduct: productRevenue[0].name,
}
export const recentSales = [...sales].sort((a, b) => b.sale_date.localeCompare(a.sale_date))
