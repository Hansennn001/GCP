import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from '@/hooks/useAuth'
import LoadingState from './LoadingState'
import { Button } from './ui/button'

export function SessionStatus() {
  const { status, error, retry, logout } = useAuth()
  if (status === 'loading') return <LoadingState label="Checking your session…" />
  if (status === 'error') return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-5 px-6 text-center">
      <p role="alert" className="text-sm text-slate-600">{error}</p>
      <div className="flex gap-3">
        <Button onClick={() => void retry()}>Try again</Button>
        <Button variant="outline" onClick={logout}>Back to sign in</Button>
      </div>
    </div>
  )
  return null
}

export default function ProtectedRoute() {
  const { status } = useAuth()
  const location = useLocation()
  if (status === 'loading' || status === 'error') return <SessionStatus />
  if (status !== 'authenticated') return <Navigate to="/login" state={{ from: location.pathname }} replace />
  return <Outlet />
}
