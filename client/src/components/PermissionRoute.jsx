import { ShieldX } from 'lucide-react'
import { Link } from 'react-router'
import { useAuth } from '@/hooks/useAuth'
import { can } from '@/lib/permissions'
import { Button } from './ui/button'

export default function PermissionRoute({ permission, children }) {
  const { user, logout } = useAuth()
  if (can(user, permission)) return children

  return (
    <section className="flex min-h-80 flex-col items-center justify-center gap-4 rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center">
      <ShieldX aria-hidden="true" className="size-9 text-slate-400" />
      <h1 className="text-2xl font-semibold text-slate-900">Access restricted</h1>
      <p className="max-w-sm text-sm leading-6 text-slate-500">Your account does not have access to this page.</p>
      {can(user, 'dashboard.read')
        ? <Button asChild><Link to="/dashboard">Back to dashboard</Link></Button>
        : <Button onClick={logout}>Sign out</Button>}
    </section>
  )
}
