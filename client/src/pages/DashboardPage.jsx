import { ArrowRight, Banknote, ReceiptText, ShoppingBag, Trophy } from 'lucide-react'
import { Link } from 'react-router'
import PageHeader from '@/components/PageHeader'
import StatCard from '@/components/StatCard'
import SalesChart from '@/components/SalesChart'
import DataTable from '@/components/DataTable'
import Panel from '@/components/Panel'
import { reportingPeriod, summary, revenueTrend, recentSales, topProducts } from '@/data/mockData'
import { formatCompactCurrency, formatCurrency, formatDate, formatNumber } from '@/lib/format'

const columns = [
  { key: 'sale_date', label: 'Date', render: formatDate },
  { key: 'product', label: 'Product', render: (value) => <span className="font-medium text-slate-800">{value}</span> },
  { key: 'region', label: 'Region' },
  { key: 'quantity', label: 'Quantity', numeric: true },
  { key: 'revenue', label: 'Revenue', numeric: true, render: formatCurrency },
]

export default function DashboardPage() {
  return (
    <>
      <PageHeader title="Dashboard" section="Overview" description="A clear view of your sales performance, all in one place." period={reportingPeriod} />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Revenue" value={formatCompactCurrency(summary.totalRevenue)} detail="Across all sample transactions · IDR" icon={Banknote} />
        <StatCard label="Total Orders" value={formatNumber(summary.totalOrders)} detail="One order per sample transaction" icon={ReceiptText} />
        <StatCard label="Average Order Value" value={formatCompactCurrency(summary.averageOrderValue)} detail="Revenue divided by total orders · IDR" icon={ShoppingBag} />
        <StatCard label="Top Product" value={summary.topProduct} detail="Highest revenue in the sample period" icon={Trophy} />
      </div>
      <div className="mb-6 grid min-w-0 gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <SalesChart title="Revenue Trend" description="Monthly sales revenue · IDR in millions" data={revenueTrend} trend />
        <Panel title="Leading products" description="Ranked by sample revenue">
          <ol className="space-y-5 px-5 pb-6 sm:px-6">
            {topProducts.map((product, index) => (
              <li key={product.name} className="flex items-center gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-xs font-medium text-slate-400">{String(index + 1).padStart(2, '0')}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap justify-between gap-1 text-xs"><span className="font-medium text-slate-700">{product.name}</span><span className="text-slate-500">{formatCompactCurrency(product.revenue)}</span></div>
                  <div className="mt-2 h-1.5 rounded-full bg-slate-100"><div className="h-1.5 rounded-full bg-emerald-500" style={{ width: `${product.revenue / topProducts[0].revenue * 100}%` }} /></div>
                </div>
              </li>
            ))}
          </ol>
        </Panel>
      </div>
      <Panel title="Recent transactions" description="The five latest sample sales" action={<Link to="/transactions" className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">View all <ArrowRight aria-hidden="true" className="size-3.5" /></Link>}>
        <DataTable caption="Recent sample transactions" columns={columns} rows={recentSales.slice(0, 5)} rowKey="sale_id" />
      </Panel>
    </>
  )
}
