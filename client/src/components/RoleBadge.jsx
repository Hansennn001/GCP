const styles = {
  admin: 'bg-violet-50 text-violet-700 ring-violet-200',
  analyst: 'bg-sky-50 text-sky-700 ring-sky-200',
  viewer: 'bg-slate-100 text-slate-600 ring-slate-200',
}

export default function RoleBadge({ role }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize ring-1 ring-inset ${styles[role] ?? styles.viewer}`}>{role}</span>
}
