import { Navigate, Route, Routes } from 'react-router'
import DashboardLayout from '@/layouts/DashboardLayout'
import PlaceholderPage from '@/pages/PlaceholderPage'
import NotFoundPage from '@/pages/NotFoundPage'
import { navigation } from '@/lib/navigation'
import DashboardPage from '@/pages/DashboardPage'
import TransactionsPage from '@/pages/TransactionsPage'
import AnalyticsPage from '@/pages/AnalyticsPage'
import UsersPage from '@/pages/UsersPage'
import AuditLogsPage from '@/pages/AuditLogsPage'

const pages = {
  '/dashboard': DashboardPage,
  '/transactions': TransactionsPage,
  '/analytics': AnalyticsPage,
  '/users': UsersPage,
  '/audit-logs': AuditLogsPage,
}

export default function App() {
  return (
    <Routes>
      <Route element={<DashboardLayout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        {navigation.map((page) => {
          const Page = pages[page.path]
          return <Route key={page.path} path={page.path} element={Page ? <Page /> : <PlaceholderPage page={page} />} />
        })}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
