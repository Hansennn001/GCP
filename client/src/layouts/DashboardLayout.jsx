import { useEffect, useState } from 'react'
import { ChevronRight, LogOut, Menu, PanelsTopLeft, X } from 'lucide-react'
import { Link, Outlet, useLocation } from 'react-router'
import { useAuth } from '@/hooks/useAuth'
import RoleBadge from '@/components/RoleBadge'
import { can } from '@/lib/permissions'
import Sidebar from '@/components/Sidebar'
import { Button } from '@/components/ui/button'
import { navigation } from '@/lib/navigation'

export default function DashboardLayout() {
  const { user, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const { pathname } = useLocation()
  const page = navigation.find((item) => item.path === pathname)
  const title = page?.permission && !can(user, page.permission) ? 'Access restricted' : page?.title ?? 'Page not found'

  useEffect(() => {
    document.title = `${title} | Sales Insight Dashboard`
  }, [title])

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-3 focus:shadow-lg">
        Skip to content
      </a>
      <div className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-5 lg:hidden">
        <Link to="/dashboard" onClick={() => setMenuOpen(false)} className="text-sm font-semibold">Sales Insight</Link>
        <Button
          variant="outline"
          size="icon-lg"
          className="size-11"
          aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
          aria-expanded={menuOpen}
          aria-controls="workspace-sidebar"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
        </Button>
      </div>
      <Sidebar open={menuOpen} onNavigate={() => setMenuOpen(false)} />
      <div className="lg:pl-64">
        <header className="flex min-h-20 items-center justify-between gap-4 border-b border-slate-200 bg-white px-5 sm:px-8 lg:px-10">
          <div className="flex min-w-0 items-center gap-2 text-sm">
            <PanelsTopLeft aria-hidden="true" className="mr-1 hidden size-4 text-slate-400 sm:block" />
            <span className="hidden text-slate-400 sm:inline">Workspace</span>
            <ChevronRight aria-hidden="true" className="hidden size-3 text-slate-300 sm:block" />
            <span className="truncate font-medium text-slate-700">{title}</span>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <span className="hidden text-sm text-slate-600 sm:block">{user.name}</span>
            <span aria-label="Current role"><RoleBadge role={user.role} /></span>
            <span className="hidden rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 md:block">Sample data</span>
            <Button variant="outline" onClick={logout} className="h-10"><LogOut aria-hidden="true" />Sign out</Button>
          </div>
        </header>
        <main id="main-content" tabIndex={-1} className="mx-auto max-w-7xl px-5 py-8 outline-none sm:px-8 lg:px-10 lg:py-10">
          <Outlet />
        </main>
        <footer className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-5 pb-6 text-xs text-slate-400 sm:px-8 lg:px-10">
          <span>Sales Insight Dashboard</span>
          <span>A clearer perspective on sales.</span>
        </footer>
      </div>
    </div>
  )
}
