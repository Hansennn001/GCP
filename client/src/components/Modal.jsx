import { useEffect, useId, useRef } from 'react'
import { X } from 'lucide-react'
import { Button } from './ui/button'

export default function Modal({ title, busy, onClose, children }) {
  const ref = useRef(null)
  const titleId = useId()
  useEffect(() => {
    const dialog = ref.current
    dialog.showModal()
    return () => dialog.close()
  }, [])
  return <dialog ref={ref} aria-labelledby={titleId} onCancel={event => { event.preventDefault(); if (!busy) onClose() }} className="m-auto max-h-[90vh] w-[calc(100%_-_2rem)] max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 shadow-xl backdrop:bg-slate-950/40">
    <div className="mb-5 flex items-center justify-between gap-3"><h2 id={titleId} className="text-xl font-semibold">{title}</h2><Button variant="ghost" size="icon" aria-label="Close dialog" disabled={busy} onClick={onClose}><X aria-hidden="true" /></Button></div>
    {children}
  </dialog>
}
