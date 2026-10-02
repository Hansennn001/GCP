import PageHeader from '@/components/PageHeader'
import Panel from '@/components/Panel'
import DataTable from '@/components/DataTable'
import { auditLogs } from '@/data/mockData'
import { formatTimestamp } from '@/lib/format'

const actionStyles = {
  LOGIN: 'bg-slate-100 text-slate-600',
  CREATE_SALE: 'bg-emerald-50 text-emerald-700',
  DELETE_SALE: 'bg-rose-50 text-rose-700',
  UPDATE_ROLE: 'bg-violet-50 text-violet-700',
}
const columns = [
  { key: 'created_at', label: 'Time (WIB)', render: formatTimestamp },
  { key: 'user', label: 'User', render: (value) => <span className="font-medium text-slate-800">{value}</span> },
  { key: 'action', label: 'Action', render: (action) => <span className={`rounded-md px-2 py-1 font-mono text-[10px] font-medium ${actionStyles[action]}`}>{action}</span> },
  { key: 'resource', label: 'Resource', render: (value) => <span className="font-mono text-xs">{value}</span> },
  { key: 'details', label: 'Details' },
]

export default function AuditLogsPage() {
  return (
    <>
      <PageHeader title="Audit Logs" section="Administration" description="Keep track of activity across your workspace." />
      <Panel title="Workspace activity" description="Illustrative events · newest first · September 2026">
        <DataTable caption="Sample workspace audit logs" columns={columns} rows={auditLogs} rowKey="log_id" />
        <p className="border-t border-slate-100 px-5 py-4 text-xs text-slate-400">{auditLogs.length} sample events · timestamps use Asia/Jakarta (WIB)</p>
      </Panel>
    </>
  )
}
