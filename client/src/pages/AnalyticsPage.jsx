import PageHeader from '@/components/PageHeader'
import SalesChart from '@/components/SalesChart'
import { productRevenue, regionRevenue, revenueTrend, topProducts, reportingPeriod } from '@/data/mockData'

export default function AnalyticsPage() {
  return (
    <>
      <PageHeader title="Analytics" description="Turn sales performance into useful insights." period={reportingPeriod} />
      <div className="grid min-w-0 gap-6 xl:grid-cols-2">
        <SalesChart title="Revenue Trend" description="Monthly revenue · IDR in millions" data={revenueTrend} trend />
        <SalesChart title="Revenue by Product" description="Revenue across all six products · IDR in millions" data={productRevenue} color="#0284c7" />
        <SalesChart title="Revenue by Region" description="Revenue across five regions · IDR in millions" data={regionRevenue} color="#0d9488" />
        <SalesChart title="Top Products" description="Top five products ranked by revenue · IDR in millions" data={topProducts} color="#7c3aed" />
      </div>
    </>
  )
}
