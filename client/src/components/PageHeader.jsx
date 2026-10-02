import { CalendarDays } from 'lucide-react'

export default function PageHeader({ title, description, section = 'Workspace', period }) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="mb-2 text-xs font-medium tracking-[0.16em] text-slate-400 uppercase">{section}</p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-slate-500">{description}</p>
      </div>
      {period && <span className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600"><CalendarDays aria-hidden="true" className="size-4 text-slate-400" />{period}</span>}
    </div>
  )
}
