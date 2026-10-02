export default function Panel({ title, description, action, children, className = '' }) {
  return (
    <section aria-label={title} className={`min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-5 sm:px-6">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
          {description && <p className="mt-1 text-xs leading-5 text-slate-400">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}
