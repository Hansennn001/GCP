export default function StatCard({ label, value, detail, icon: Icon }) {
  return (
    <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xs font-medium text-slate-500">{label}</h2>
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600"><Icon aria-hidden="true" className="size-4" /></span>
      </div>
      <p className="mt-4 break-words text-2xl font-semibold tracking-tight text-slate-900">{value}</p>
      <p className="mt-2 text-xs leading-5 text-slate-400">{detail}</p>
    </article>
  )
}
