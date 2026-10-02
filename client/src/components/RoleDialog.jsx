import { useState } from 'react'
import Modal from './Modal'
import { Button } from './ui/button'
import { updateRole } from '@/services/workspace'

export default function RoleDialog({ user, onClose, onSaved }) {
  const [role, setRole] = useState(user.role)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function submit(event) {
    event.preventDefault()
    if (busy || role === user.role) return
    setBusy(true)
    setError('')
    try { await updateRole(user.userId, role); onSaved() }
    catch (error) { setError(error.status === 403 ? 'Your role does not allow this action.' : 'Could not update the role. Please try again.') }
    finally { setBusy(false) }
  }
  return <Modal title="Change user role" busy={busy} onClose={onClose}>
    <p className="mb-5 break-words text-sm text-slate-600">{user.name} · {user.email}</p>
    <form onSubmit={submit} aria-busy={busy}>
      <label className="block text-sm font-medium">New role<select required value={role} onChange={event => setRole(event.target.value)} disabled={busy} className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3"><option value="admin">Admin</option><option value="analyst">Analyst</option><option value="viewer">Viewer</option></select></label>
      {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
      <div className="mt-6 flex justify-end gap-3"><Button type="button" variant="outline" disabled={busy} onClick={onClose}>Cancel</Button><Button type="submit" disabled={busy || role === user.role}>{busy ? 'Saving…' : 'Save role'}</Button></div>
    </form>
  </Modal>
}
