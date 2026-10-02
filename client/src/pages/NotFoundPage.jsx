import { Link } from 'react-router'
import { Button } from '@/components/ui/button'

export default function NotFoundPage() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white px-6 py-20 text-center">
      <p className="text-xs font-semibold tracking-widest text-slate-400">404</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">Page not found</h1>
      <p className="mt-3 text-sm text-slate-500">The page you’re looking for doesn’t exist.</p>
      <Button asChild className="mt-6">
        <Link to="/dashboard">Back to dashboard</Link>
      </Button>
    </section>
  )
}
