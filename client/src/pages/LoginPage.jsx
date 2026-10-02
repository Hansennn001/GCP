import { useEffect, useState } from 'react'
import { ChartNoAxesCombined, ArrowRight, LoaderCircle } from 'lucide-react'
import { Navigate, useLocation, useNavigate } from 'react-router'
import { useAuth } from '@/hooks/useAuth'
import { SessionStatus } from '@/components/SessionGate'
import { Button } from '@/components/ui/button'

export default function LoginPage() {
  const { login, status } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const requested = location.state?.from
  const destination = typeof requested === 'string' && requested.startsWith('/') && !requested.startsWith('//') && requested !== '/login' ? requested : '/dashboard'

  useEffect(() => { document.title = 'Sign in | Sales Insight Dashboard' }, [])

  async function submit(event) {
    event.preventDefault()
    if (busy) return
    setError('')
    setBusy(true)
    try {
      await login(email.trim(), password)
      setPassword('')
      navigate(destination, { replace: true })
    } catch (error) {
      setPassword('')
      setError(error.status === 401 ? 'Invalid email or password.' : 'Unable to sign in. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  if (status === 'loading' || status === 'error') return <SessionStatus />
  if (status === 'authenticated') return <Navigate to={destination} replace />

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-xl bg-emerald-400 text-slate-950"><ChartNoAxesCombined aria-hidden="true" className="size-6" /></span>
          <span className="text-xl font-semibold tracking-tight text-slate-900">Sales Insight</span>
        </div>
        <section aria-labelledby="login-heading" className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm sm:p-9">
          <p className="mb-3 text-xs font-semibold tracking-widest text-emerald-700 uppercase">Your sales workspace</p>
          <h1 id="login-heading" className="text-2xl font-semibold tracking-tight text-slate-900">Welcome back</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">Sign in to explore your sales dashboard.</p>
          <form onSubmit={submit} className="mt-7 space-y-5" aria-busy={busy}>
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-700">Email address</label>
              <input id="email" type="email" autoComplete="username" required maxLength={254} value={email} onChange={event => setEmail(event.target.value)} disabled={busy} className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:opacity-60" />
            </div>
            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-medium text-slate-700">Password</label>
              <input id="password" type="password" autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)} disabled={busy} aria-describedby={error ? 'login-error' : undefined} className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:opacity-60" />
            </div>
            {error && <p id="login-error" role="alert" className="rounded-lg bg-red-50 px-3 py-3 text-sm text-red-700">{error}</p>}
            <Button type="submit" disabled={busy} className="h-11 w-full bg-slate-950 text-white hover:bg-slate-800">
              {busy ? <><LoaderCircle aria-hidden="true" className="size-4 motion-safe:animate-spin" />Signing in…</> : <>Sign in<ArrowRight aria-hidden="true" className="size-4" /></>}
            </Button>
          </form>
        </section>
        <p className="mt-6 text-center text-xs text-slate-400">Sales Insight Dashboard · Your sales, in perspective.</p>
      </div>
    </main>
  )
}
