import { ShieldCheck, UserCheck, Users } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import Panel from '@/components/Panel'
import DataTable from '@/components/DataTable'
import RoleBadge from '@/components/RoleBadge'
import StatCard from '@/components/StatCard'
import { users } from '@/data/mockData'
import { formatDate } from '@/lib/format'

const columns = [
  { key: 'name', label: 'Name', render: (name, row) => <div className="flex items-center gap-3"><span aria-hidden="true" className="flex size-9 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-500">{name.split(' ').map((part) => part[0]).join('')}</span><div><p className="font-medium text-slate-800">{name}</p><p className="mt-1 text-[11px] text-slate-400">{row.user_id}</p></div></div> },
  { key: 'email', label: 'Email' },
  { key: 'role', label: 'Role', render: (role) => <RoleBadge role={role} /> },
  { key: 'status', label: 'Status', render: (status) => <span className={`inline-flex items-center gap-1.5 text-xs capitalize ${status === 'active' ? 'text-emerald-700' : 'text-slate-400'}`}><span aria-hidden="true" className={`size-1.5 rounded-full ${status === 'active' ? 'bg-emerald-500' : 'bg-slate-300'}`} />{status}</span> },
  { key: 'created_at', label: 'Created At', render: formatDate },
]

export default function UsersPage() {
  return (
    <>
      <PageHeader title="Users" section="Administration" description="A dedicated space for managing your team." />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Team members" value={users.length} detail="Sample workspace members" icon={Users} />
        <StatCard label="Active members" value={users.filter((user) => user.status === 'active').length} detail="Members with an active sample status" icon={UserCheck} />
        <StatCard label="Roles" value="3" detail="Admin, analyst, and viewer" icon={ShieldCheck} />
      </div>
      <Panel title="Workspace members" description="Sample team directory · read-only preview">
        <DataTable caption="Sample workspace users" columns={columns} rows={users} rowKey="user_id" />
        <p className="border-t border-slate-100 px-5 py-4 text-xs text-slate-400">{users.length} sample members · role badges are for display</p>
      </Panel>
    </>
  )
}
