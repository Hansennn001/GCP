import PageHeader from '@/components/PageHeader'
import Panel from '@/components/Panel'
import DataTable from '@/components/DataTable'
import { useCallback, useState } from 'react'
import { listLogs } from '@/services/workspace'
import { useApiData } from '@/hooks/useApiData'
import ResourceState from '@/components/ResourceState'
import Pagination from '@/components/Pagination'
import { Button } from '@/components/ui/button'
import { formatTimestamp } from '@/lib/format'

const actionStyles = {
  LOGIN: 'bg-slate-100 text-slate-600',
  CREATE_SALE: 'bg-emerald-50 text-emerald-700',
  DELETE_SALE: 'bg-rose-50 text-rose-700',
  UPDATE_ROLE: 'bg-violet-50 text-violet-700',
}
const columns = [
  { key: 'createdAt', label: 'Time (WIB)', render: formatTimestamp },
  { key: 'userId', label: 'User', render: (value) => <span className="font-medium text-slate-800">{value}</span> },
  { key: 'action', label: 'Action', render: (action) => <span className={`rounded-md px-2 py-1 font-mono text-[10px] font-medium ${Object.hasOwn(actionStyles, action) ? actionStyles[action] : actionStyles.LOGIN}`}>{action}</span> },
  { key: 'resource', label: 'Resource', render: (value) => <span className="font-mono text-xs">{value}</span> },
  { key: 'details', label: 'Details', render: value => <span className="block max-w-md whitespace-pre-wrap break-words text-xs">{value}</span> },
]

export default function AuditLogsPage() {
  const [offset, setOffset] = useState(0)
  const loader = useCallback(signal => listLogs(offset, signal), [offset])
  const resource = useApiData(loader)
  const auditLogs = resource.data?.logs ?? []
  return (
    <>
      <PageHeader title="Audit Logs" section="Administration" description="Keep track of activity across your workspace." />
      <Panel title="Workspace activity" description="Newest first · timestamps use Asia/Jakarta (WIB)" action={<Button variant="outline" disabled={resource.loading} onClick={resource.reload}>Refresh</Button>}>
        <ResourceState resource={resource} />
        {resource.data && <><DataTable caption="Workspace audit logs" columns={columns} rows={auditLogs} rowKey="logId" emptyDescription="No activity has been recorded yet." /><Pagination offset={offset} count={auditLogs.length} setOffset={setOffset} /></>}
      </Panel>
    </>
  )
}
