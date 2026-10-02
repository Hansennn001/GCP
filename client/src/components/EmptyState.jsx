import { Inbox } from 'lucide-react'

export default function EmptyState({ title = 'No records found', description = 'Try a different search to find what you’re looking for.' }) {
  return (
    <div className="flex flex-col items-center px-6 py-16 text-center" role="status">
      <span className="mb-4 rounded-xl bg-slate-50 p-3 text-slate-400"><Inbox aria-hidden="true" className="size-6" /></span>
      <p className="text-sm font-medium text-slate-700">{title}</p>
      <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">{description}</p>
    </div>
  )
}
