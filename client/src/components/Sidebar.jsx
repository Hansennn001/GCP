import { ArrowUpRight, ChartNoAxesCombined } from 'lucide-react'
import { Link, NavLink } from 'react-router'
import { useAuth } from '@/hooks/useAuth'
import { can } from '@/lib/permissions'
import { navigation } from '@/lib/navigation'

export default function Sidebar({ open, onNavigate }) {
  const { user } = useAuth()
  return (
    <aside
      id="workspace-sidebar"
      aria-label="Workspace sidebar"
      className={`${open ? 'flex' : 'hidden'} flex-col bg-slate-950 text-slate-300 lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:overflow-y-auto`}
    >
      <Link to="/dashboard" onClick={onNavigate} className="flex items-center gap-3 px-6 py-7 text-white">
        <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-400 text-slate-950">
          <ChartNoAxesCombined aria-hidden="true" className="size-5" />
        </span>
        <span>
          <span className="block text-base font-semibold tracking-tight">Sales Insight</span>
          <span className="block text-xs text-slate-400">Your sales workspace</span>
        </span>
      </Link>
      <div className="mx-4 flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900 px-3 py-3">
        <span className="flex size-8 items-center justify-center rounded-lg bg-slate-800 text-xs font-semibold text-slate-200">SI</span>
        <div>
          <p className="text-sm font-medium text-slate-100">Sales workspace</p>
          <p className="text-xs text-slate-400">Sales and team activity</p>
        </div>
      </div>
      <nav aria-label="Main navigation" className="flex-1 space-y-1 px-4 py-7">
        <p className="mb-3 px-3 text-[10px] font-semibold tracking-[0.18em] text-slate-500 uppercase">Workspace</p>
        {navigation.filter(page => can(user, page.permission)).map(({ path, title, icon: Icon }, index) => (
          <NavLink
            key={path}
            to={path}
            onClick={onNavigate}
            className={({ isActive }) => `flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium ${index === 3 ? 'mt-6' : ''} ${isActive ? 'bg-emerald-400/10 text-emerald-300' : 'text-slate-400 hover:bg-slate-900 hover:text-white'}`}
          >
            <Icon aria-hidden="true" className="size-[18px]" />
            {title}
          </NavLink>
        ))}
      </nav>
      <div className="m-4 rounded-xl border border-slate-800 p-4">
        <ArrowUpRight aria-hidden="true" className="mb-3 size-5 text-emerald-300" />
        <p className="text-sm font-medium text-slate-100">Room for better insights</p>
        <p className="mt-1 text-xs leading-5 text-slate-400">Sales, trends, and team activity in one workspace.</p>
      </div>
      <p className="px-6 pb-5 text-[11px] text-slate-500">Sales Insight Dashboard</p>
    </aside>
  )
}
