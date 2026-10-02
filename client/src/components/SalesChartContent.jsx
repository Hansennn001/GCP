import { useId } from 'react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import Panel from '@/components/Panel'
import { formatCurrency } from '@/lib/format'

export default function SalesChartContent({ title, description, data, trend = false, color = '#059669' }) {
  const gradientId = useId()
  const axis = { axisLine: false, tickLine: false, tick: { fill: '#64748b', fontSize: 11 } }
  const moneyTick = (value) => `${value / 1000000}M`
  const tooltip = <Tooltip formatter={(value) => [formatCurrency(value), 'Revenue']} contentStyle={{ borderRadius: 12, borderColor: '#e2e8f0', fontSize: 12 }} cursor={trend ? { stroke: '#cbd5e1' } : { fill: '#f1f5f9' }} />

  return (
    <Panel title={title} description={description}>
      <div className="px-3 pb-3 sm:px-5" role="group" aria-label={`${title} chart`}>
        <ResponsiveContainer width="100%" height={280} minWidth={0} initialDimension={{ width: 500, height: 280 }}>
          {trend ? (
            <AreaChart data={data} margin={{ top: 15, right: 15, bottom: 5, left: 0 }} accessibilityLayer>
              <defs><linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity={0.18} /><stop offset="100%" stopColor={color} stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="month" {...axis} tickMargin={12} />
              <YAxis {...axis} width={45} tickFormatter={moneyTick} />
              {tooltip}
              <Area dataKey="revenue" type="monotone" stroke={color} strokeWidth={2.5} fill={`url(#${gradientId})`} isAnimationActive={false} />
            </AreaChart>
          ) : (
            <BarChart data={data} layout="vertical" margin={{ top: 5, right: 18, bottom: 5, left: 0 }} accessibilityLayer>
              <CartesianGrid horizontal={false} stroke="#f1f5f9" />
              <XAxis type="number" {...axis} tickFormatter={moneyTick} />
              <YAxis dataKey="name" type="category" {...axis} width={118} />
              {tooltip}
              <Bar dataKey="revenue" fill={color} radius={[0, 5, 5, 0]} barSize={20} isAnimationActive={false} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
      <details className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
        <summary className="cursor-pointer rounded-sm font-medium focus-visible:outline-2 focus-visible:outline-emerald-500">View chart data</summary>
        <table className="mt-3 w-full text-left">
          <caption className="sr-only">{title} data in Indonesian rupiah</caption>
          <thead><tr><th scope="col" className="py-2 font-medium">{trend ? 'Month' : 'Name'}</th><th scope="col" className="py-2 text-right font-medium">Revenue (IDR)</th></tr></thead>
          <tbody>{data.map((item) => <tr key={item.name ?? item.month}><td className="py-1.5">{item.name ?? item.month}</td><td className="py-1.5 text-right tabular-nums">{formatCurrency(item.revenue)}</td></tr>)}</tbody>
        </table>
      </details>
    </Panel>
  )
}
