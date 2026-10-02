import { Navigate, Route, Routes } from 'react-router'
import DashboardLayout from '@/layouts/DashboardLayout'
import PlaceholderPage from '@/pages/PlaceholderPage'
import NotFoundPage from '@/pages/NotFoundPage'
import { navigation } from '@/lib/navigation'

export default function App() {
  return (
    <Routes>
      <Route element={<DashboardLayout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        {navigation.map((page) => (
          <Route key={page.path} path={page.path} element={<PlaceholderPage page={page} />} />
        ))}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
