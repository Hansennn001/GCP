export default function PlaceholderPage({ page }) {
  const Icon = page.icon

  return (
    <>
      <div className="mb-8">
        <p className="mb-2 text-xs font-medium tracking-[0.16em] text-slate-400 uppercase">{page.section}</p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{page.title}</h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-slate-500">{page.description}</p>
      </div>
      <section aria-labelledby="placeholder-title" className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-5">
          <h2 id="placeholder-title" className="text-sm font-semibold text-slate-700">{page.title} workspace</h2>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-medium text-emerald-700">Coming soon</span>
        </div>
        <div className="p-5 sm:p-8">
          <div className="flex min-h-80 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-5 py-12 text-center lg:min-h-96">
            <span className="mb-5 flex size-16 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-400 shadow-xs">
              <Icon aria-hidden="true" className="size-7" strokeWidth={1.5} />
            </span>
            <p className="max-w-sm text-base font-medium text-slate-700">{page.placeholder}</p>
            <p className="mt-2 max-w-xs text-sm leading-6 text-slate-400">This space is ready for the next chapter.</p>
          </div>
        </div>
      </section>
    </>
  )
}
