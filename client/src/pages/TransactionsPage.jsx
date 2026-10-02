import { useCallback, useState } from 'react'
import { Plus, Search, Trash2 } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useApiData } from '@/hooks/useApiData'
import { listSales } from '@/services/workspace'
import { can } from '@/lib/permissions'
import { Button } from '@/components/ui/button'
import { CreateTransactionDialog, DeleteTransactionDialog } from '@/components/TransactionDialogs'
import ResourceState from '@/components/ResourceState'
import Pagination from '@/components/Pagination'
import PageHeader from '@/components/PageHeader'
import Panel from '@/components/Panel'
import DataTable from '@/components/DataTable'
import { formatCurrency, formatDate } from '@/lib/format'

const columns = [
  { key: 'sale_date', label: 'Date', render: formatDate },
  { key: 'product', label: 'Product', render: (value, row) => <div><p className="font-medium text-slate-800">{value}</p><p className="mt-1 max-w-48 break-all text-[11px] text-slate-400">{row.sale_id}</p></div> },
  { key: 'category', label: 'Category' }, { key: 'region', label: 'Region' },
  { key: 'quantity', label: 'Quantity', numeric: true },
  { key: 'revenue', label: 'Revenue', numeric: true, render: formatCurrency },
  { key: 'cost', label: 'Cost', numeric: true, render: formatCurrency },
  { key: 'created_by', label: 'Created By' },
]

export default function TransactionsPage() {
  const { user } = useAuth()
  const [offset, setOffset] = useState(0)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [notice, setNotice] = useState('')
  const loader = useCallback(signal => listSales(offset, signal), [offset])
  const resource = useApiData(loader)
  const sales = resource.data?.sales ?? []
  const query = search.trim().toLowerCase()
  const rows = sales.filter(sale => [sale.product, sale.category, sale.region, sale.created_by, sale.sale_id].some(value => String(value).toLowerCase().includes(query)))
  const saved = message => { setSelected(null); setNotice(message); resource.reload() }
  const visibleColumns = can(user, 'sales.delete') ? [...columns, {
    key: 'actions', label: 'Actions', render: (_value, row) => <Button variant="ghost" aria-label={`Delete transaction ${row.sale_id}`} onClick={() => { setNotice(''); setSelected(row) }}><Trash2 aria-hidden="true" />Delete</Button>,
  }] : columns
  return <>
    <PageHeader title="Transactions" description="Explore the sales activity behind your business." />
    {notice && <p role="status" className="mb-4 text-sm text-emerald-700">{notice}</p>}
    <Panel title="Sales transactions" description="All amounts in IDR · search applies to this page" action={
      <div className="flex w-full flex-wrap gap-3 sm:w-auto">
        <label className="flex w-full items-center gap-2 rounded-lg border border-slate-200 px-3 sm:w-64"><Search aria-hidden="true" className="size-4 text-slate-400" /><span className="sr-only">Search this page</span><input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search this page…" className="h-10 min-w-0 flex-1 text-xs outline-none" /></label>
        <Button variant="outline" disabled={resource.loading} onClick={resource.reload}>Refresh</Button>
        {can(user, 'sales.create') && <Button className="h-10" onClick={() => { setNotice(''); setSelected('create') }}><Plus aria-hidden="true" />Create transaction</Button>}
      </div>
    }>
      <ResourceState resource={resource} />
      {resource.data && <><DataTable caption="Sales transactions" columns={visibleColumns} rows={rows} rowKey="sale_id" emptyDescription={query ? 'No matches on this page. Try another search or page.' : 'No transactions on this page.'} /><Pagination offset={offset} count={sales.length} setOffset={value => { setSearch(''); setOffset(value) }} /></>}
    </Panel>
    {selected === 'create' && can(user, 'sales.create') && <CreateTransactionDialog onClose={() => setSelected(null)} onSaved={saved} />}
    {selected && selected !== 'create' && can(user, 'sales.delete') && <DeleteTransactionDialog sale={selected} onClose={() => setSelected(null)} onSaved={saved} />}
  </>
}
