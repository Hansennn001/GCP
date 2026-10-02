import LoadingState from './LoadingState'
import { Button } from './ui/button'

export default function ResourceState({ resource }) {
  if (resource.loading) return <LoadingState label="Loading workspace data…" />
  if (resource.error) return <div className="rounded-xl border border-red-100 bg-white p-6"><p role="alert" className="mb-4 text-sm text-red-700">{resource.error}</p><Button variant="outline" onClick={resource.reload}>Try again</Button></div>
  return null
}
