import { useState } from 'react'
import { Plus, Search, Trash2 } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { can } from '@/lib/permissions'
import { Button } from '@/components/ui/button'
import PageHeader from '@/components/PageHeader'
import Panel from '@/components/Panel'
import DataTable from '@/components/DataTable'
import { recentSales, reportingPeriod } from '@/data/mockData'
import { formatCurrency, formatDate } from '@/lib/format'

const columns = [
  { key: 'sale_date', label: 'Date', render: formatDate },
  { key: 'product', label: 'Product', render: (value, row) => <div><p className="font-medium text-slate-800">{value}</p><p className="mt-1 text-[11px] text-slate-400">{row.sale_id}</p></div> },
  { key: 'category', label: 'Category' },
  { key: 'region', label: 'Region' },
  { key: 'quantity', label: 'Quantity', numeric: true },
  { key: 'revenue', label: 'Revenue', numeric: true, render: formatCurrency },
  { key: 'cost', label: 'Cost', numeric: true, render: formatCurrency },
  { key: 'created_by', label: 'Created By' },
]

export default function TransactionsPage() {
  const { user } = useAuth()
  const [search, setSearch] = useState('')
  const query = search.trim().toLowerCase()
  const rows = recentSales.filter((sale) => [sale.product, sale.category, sale.region, sale.created_by, sale.sale_id].some((value) => value.toLowerCase().includes(query)))

  const visibleColumns = can(user, 'sales.delete') ? [...columns, {
    key: 'actions', label: 'Actions', render: (_value, row) => (
      <Button variant="ghost" disabled aria-label={`Delete transaction ${row.sale_id}`} title="Sample data is read-only">
        <Trash2 aria-hidden="true" />Delete
      </Button>
    ),
  }] : columns

  return (
    <>
      <PageHeader title="Transactions" description="Explore the sales activity behind your business." period={reportingPeriod} />
      <Panel title="Sales transactions" description="Read-only sample sales records · all amounts in IDR" action={
        <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
          <label className="flex w-full items-center gap-2 rounded-lg border border-slate-200 px-3 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-100 sm:w-64">
            <Search aria-hidden="true" className="size-4 shrink-0 text-slate-400" />
            <span className="sr-only">Search transactions</span>
            <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search sales, region, or team…" className="h-10 min-w-0 flex-1 bg-transparent text-xs outline-none" />
          </label>
          {can(user, 'sales.create') && <Button disabled title="Sample data is read-only" className="h-10"><Plus aria-hidden="true" />Create transaction</Button>}
        </div>
      }>
        <DataTable caption="Sample sales transactions" columns={visibleColumns} rows={rows} rowKey="sale_id" />
        <div className="border-t border-slate-100 px-5 py-4 text-xs text-slate-400">Showing {rows.length} of {recentSales.length} sample transactions</div>
      </Panel>
    </>
  )
}
