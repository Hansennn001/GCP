import { Navigate, Route, Routes } from 'react-router'
import DashboardLayout from '@/layouts/DashboardLayout'
import LoginPage from '@/pages/LoginPage'
import ProtectedRoute from '@/components/SessionGate'
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
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          {navigation.filter(page => page.path !== '/login').map((page) => {
            const Page = pages[page.path]
            return <Route key={page.path} path={page.path} element={<Page />} />
          })}
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  )
}
