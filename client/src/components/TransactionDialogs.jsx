import { useState } from 'react'
import Modal from './Modal'
import { Button } from './ui/button'
import { createSale, deleteSale } from '@/services/workspace'

const inputClass = 'mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:opacity-60'
function mutationError(error, action) {
  if (error.status === 403) return 'Your role does not allow this action.'
  if (error.status === 400) return 'Check the date, quantity, and amounts, then try again.'
  return `Could not ${action} the transaction. Please try again.`
}

export function CreateTransactionDialog({ onClose, onSaved }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function submit(event) {
    event.preventDefault()
    if (busy) return
    const body = Object.fromEntries(new FormData(event.currentTarget))
    body.quantity = Number(body.quantity)
    for (const field of ['product', 'category', 'region']) body[field] = body[field].trim()
    if (!Number.isSafeInteger(body.quantity) || body.quantity < 1 || !body.product || !body.category || !body.region) {
      setError('Enter a positive whole quantity and nonempty product, category, and region.')
      return
    }
    setBusy(true)
    setError('')
    try { await createSale(body); onSaved('Transaction created.') }
    catch (error) { setError(mutationError(error, 'create')) }
    finally { setBusy(false) }
  }
  return <Modal title="Create transaction" busy={busy} onClose={onClose}>
    <form onSubmit={submit} className="space-y-4" aria-busy={busy}>
      <label className="block text-sm font-medium">Sale date<input name="sale_date" type="date" min="0001-01-01" max="9999-12-31" required disabled={busy} className={inputClass} /></label>
      {['Product', 'Category', 'Region'].map(label => <label key={label} className="block text-sm font-medium">{label}<input name={label.toLowerCase()} required maxLength={150} disabled={busy} className={inputClass} /></label>)}
      <label className="block text-sm font-medium">Quantity<input name="quantity" type="number" min="1" max={Number.MAX_SAFE_INTEGER} step="1" required disabled={busy} className={inputClass} /></label>
      <div className="grid gap-4 sm:grid-cols-2">{['Revenue', 'Cost'].map(label => <label key={label} className="block text-sm font-medium">{label} (IDR)<input name={label.toLowerCase()} inputMode="decimal" pattern="(0|[1-9][0-9]{0,28})(\.[0-9]{1,9})?" title="Nonnegative decimal, up to 29 integer and 9 fractional digits" required disabled={busy} className={inputClass} /></label>)}</div>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <div className="flex justify-end gap-3 pt-2"><Button type="button" variant="outline" disabled={busy} onClick={onClose}>Cancel</Button><Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save transaction'}</Button></div>
    </form>
  </Modal>
}

export function DeleteTransactionDialog({ sale, onClose, onSaved }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function remove() {
    if (busy) return
    setBusy(true)
    setError('')
    try { await deleteSale(sale.sale_id); onSaved('Transaction deleted.') }
    catch (error) { if (error.status === 404) onSaved('Transaction was already removed.'); else setError(mutationError(error, 'delete')) }
    finally { setBusy(false) }
  }
  return <Modal title="Delete transaction?" busy={busy} onClose={onClose}>
    <p className="text-sm leading-6 text-slate-600">Delete {sale.product}? This cannot be undone.</p>
    <p className="mt-2 break-all font-mono text-xs text-slate-400">{sale.sale_id}</p>
    {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
    <div className="mt-6 flex justify-end gap-3"><Button variant="outline" disabled={busy} onClick={onClose}>Cancel</Button><Button variant="destructive" disabled={busy} onClick={remove}>{busy ? 'Deleting…' : 'Delete transaction'}</Button></div>
  </Modal>
}
