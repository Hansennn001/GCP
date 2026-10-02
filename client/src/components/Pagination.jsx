import { Button } from './ui/button'

export default function Pagination({ offset, count, setOffset, busy = false }) {
  return <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-4 text-xs text-slate-500">
    <span>{count ? `Showing ${offset + 1}–${offset + count}` : 'No records on this page'}</span>
    <div className="flex gap-2">
      <Button variant="outline" disabled={busy || offset === 0} onClick={() => setOffset(Math.max(0, offset - 50))}>Previous</Button>
      <Button variant="outline" disabled={busy || count < 50 || offset >= 1000000} onClick={() => setOffset(offset + 50)}>Next</Button>
    </div>
  </div>
}
