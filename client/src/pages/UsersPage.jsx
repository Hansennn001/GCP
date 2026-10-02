import { useCallback, useState } from 'react'
import { ShieldCheck, UserCheck, Users } from 'lucide-react'
import { listUsers } from '@/services/workspace'
import { useApiData } from '@/hooks/useApiData'
import { useAuth } from '@/hooks/useAuth'
import { can } from '@/lib/permissions'
import PageHeader from '@/components/PageHeader'
import Panel from '@/components/Panel'
import DataTable from '@/components/DataTable'
import RoleBadge from '@/components/RoleBadge'
import RoleDialog from '@/components/RoleDialog'
import ResourceState from '@/components/ResourceState'
import Pagination from '@/components/Pagination'
import { Button } from '@/components/ui/button'
import StatCard from '@/components/StatCard'
import { formatDate } from '@/lib/format'

const columns = [
  { key: 'name', label: 'Name', render: (name, row) => <div><p className="font-medium text-slate-800">{name}</p><p className="mt-1 max-w-48 break-all text-[11px] text-slate-400">{row.userId}</p></div> },
  { key: 'email', label: 'Email' },
  { key: 'role', label: 'Role', render: role => <RoleBadge role={role} /> },
  { key: 'status', label: 'Status', render: status => <span className={`text-xs capitalize ${status === 'active' ? 'text-emerald-700' : 'text-slate-400'}`}>{status}</span> },
  { key: 'createdAt', label: 'Created At', render: formatDate },
]
export default function UsersPage() {
  const { user: currentUser, retry } = useAuth()
  const [offset, setOffset] = useState(0)
  const [selected, setSelected] = useState(null)
  const [notice, setNotice] = useState('')
  const loader = useCallback(signal => listUsers(offset, signal), [offset])
  const resource = useApiData(loader)
  const users = resource.data?.users ?? []
  const saved = () => {
    const self = selected.userId === currentUser.userId
    setSelected(null); setNotice('User role updated.'); resource.reload()
    if (self) void retry()
  }
  const visibleColumns = can(currentUser, 'users.role.update') ? [...columns, { key: 'actions', label: 'Actions', render: (_value, row) => <Button variant="outline" aria-label={`Change role for ${row.name}`} onClick={() => { setNotice(''); setSelected(row) }}>Change role</Button> }] : columns
  return <>
    <PageHeader title="Users" section="Administration" description="Manage your team and their workspace roles." />
    {notice && <p role="status" className="mb-4 text-sm text-emerald-700">{notice}</p>}
    {resource.data && <div className="mb-6 grid gap-4 sm:grid-cols-3">
      <StatCard label="Members on this page" value={users.length} detail="Current directory page" icon={Users} />
      <StatCard label="Active on this page" value={users.filter(user => user.status === 'active').length} detail="Members with an active status" icon={UserCheck} />
      <StatCard label="Workspace roles" value="3" detail="Admin, analyst, and viewer" icon={ShieldCheck} />
    </div>}
    <Panel title="Workspace members" description="Current team directory" action={<Button variant="outline" disabled={resource.loading} onClick={resource.reload}>Refresh</Button>}>
      <ResourceState resource={resource} />
      {resource.data && <><DataTable caption="Workspace users" columns={visibleColumns} rows={users} rowKey="userId" emptyDescription="No members on this page." /><Pagination offset={offset} count={users.length} setOffset={setOffset} /></>}
    </Panel>
    {selected && can(currentUser, 'users.role.update') && <RoleDialog user={selected} onClose={() => setSelected(null)} onSaved={saved} />}
  </>
}
