import { lazy, Suspense } from 'react'
import LoadingState from '@/components/LoadingState'
import Panel from '@/components/Panel'

const SalesChartContent = lazy(() => import('./SalesChartContent'))

export default function SalesChart(props) {
  return (
    <Suspense fallback={<Panel title={props.title} description={props.description}><div className="flex h-[331px] items-center justify-center"><LoadingState label="Loading chart…" /></div></Panel>}>
      <SalesChartContent {...props} />
    </Suspense>
  )
}
