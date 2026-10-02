import { LoaderCircle } from 'lucide-react'

export default function LoadingState({ label = 'Loading records…' }) {
  return (
    <div role="status" className="flex items-center justify-center gap-3 px-6 py-16 text-sm text-slate-500">
      <LoaderCircle aria-hidden="true" className="size-5 motion-safe:animate-spin" />
      {label}
    </div>
  )
}
