import EmptyState from '@/components/EmptyState'
import LoadingState from '@/components/LoadingState'

export default function DataTable({ columns, rows, rowKey, caption, isLoading = false, emptyDescription }) {
  if (isLoading) return <LoadingState />
  if (!rows.length) return <EmptyState description={emptyDescription} />

  return (
    <div className="max-w-full overflow-x-auto" role="region" aria-label={caption} tabIndex={0}>
      <table className="w-full min-w-max border-collapse text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="border-y border-slate-100 bg-slate-50/80">
          <tr>{columns.map((column) => <th key={column.key} scope="col" className={`px-5 py-3 text-xs font-medium text-slate-500 ${column.numeric ? 'text-right' : ''}`}>{column.label}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row) => (
            <tr key={row[rowKey]} className="hover:bg-slate-50/70">
              {columns.map((column) => <td key={column.key} className={`px-5 py-4 text-slate-600 ${column.numeric ? 'text-right tabular-nums' : ''}`}>{column.render ? column.render(row[column.key], row) : row[column.key]}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
