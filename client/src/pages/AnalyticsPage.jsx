import PageHeader from '@/components/PageHeader'
import SalesChart from '@/components/SalesChart'
import { loadAnalytics } from '@/services/workspace'
import { useApiData } from '@/hooks/useApiData'
import ResourceState from '@/components/ResourceState'

export default function AnalyticsPage() {
  const resource = useApiData(loadAnalytics)
  if (!resource.data) return <><PageHeader title="Analytics" description="Turn sales performance into useful insights." /><ResourceState resource={resource} /></>
  const revenueTrend = resource.data.trend
  const productRevenue = resource.data.products.map(row => ({ ...row, name: row.product }))
  const regionRevenue = resource.data.regions.map(row => ({ ...row, name: row.region }))
  const topProducts = resource.data.top.map(row => ({ ...row, name: row.product }))
  return (
    <>
      <PageHeader title="Analytics" description="Turn sales performance into useful insights." />
      <div className="grid min-w-0 gap-6 xl:grid-cols-2">
        <SalesChart title="Revenue Trend" description="Monthly revenue · IDR in millions" data={revenueTrend} trend />
        <SalesChart title="Revenue by Product" description="Revenue by product · IDR in millions" data={productRevenue} color="#0284c7" />
        <SalesChart title="Revenue by Region" description="Revenue by region · IDR in millions" data={regionRevenue} color="#0d9488" />
        <SalesChart title="Top Products" description="Top five products ranked by revenue · IDR in millions" data={topProducts} color="#7c3aed" />
      </div>
    </>
  )
}
