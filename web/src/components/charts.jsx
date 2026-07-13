// Themed Recharts wrappers. Every chart takes `mode` ('light'|'dark') so colors,
// grid and tooltip flip with the theme. Palettes are the validated tokens
// (lib/tokens.js). Legends + labels provide secondary encoding beyond color.
import {
  PieChart, Pie, Cell, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList, Label,
} from 'recharts'
import { CHROME } from '../lib/tokens.js'
import { EmptyState } from './ui.jsx'

const tooltipStyle = (mode) => {
  const c = CHROME[mode]
  return {
    contentStyle: {
      background: c.tooltipBg, border: `1px solid ${c.tooltipBorder}`,
      borderRadius: 8, fontSize: 12, color: c.text, boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
    },
    labelStyle: { color: c.text, fontWeight: 600 },
    itemStyle: { color: c.text },
  }
}

const axisProps = (mode) => ({ tick: { fontSize: 12, fill: CHROME[mode].axis }, stroke: CHROME[mode].axis })

function ChartFrame({ height = 240, children }) {
  return <div style={{ width: '100%', height }}><ResponsiveContainer>{children}</ResponsiveContainer></div>
}

// Donut for categorical or ordinal breakdowns (ui.md §8). Identity comes from the
// legend, exact values from the tooltip, and the center shows the total — so no
// per-slice labels to clip against the panel edge.
export function PieCard({ data, colors, mode, height = 230, centerCaption = 'Tổng' }) {
  const has = data.some((d) => d.value > 0)
  if (!has) return <div style={{ height }} className="flex items-center justify-center"><EmptyState hint="Chưa có số liệu" /></div>
  const total = data.reduce((s, d) => s + d.value, 0)
  const c = CHROME[mode]
  return (
    <ChartFrame height={height}>
      <PieChart margin={{ top: 4, bottom: 4, left: 4, right: 4 }}>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={52} outerRadius={80} paddingAngle={2} isAnimationActive>
          {data.map((_, i) => (
            <Cell key={i} fill={colors[i % colors.length]} stroke={c.tooltipBg} strokeWidth={2} />
          ))}
          <Label position="center" content={({ viewBox }) => {
            const { cx, cy } = viewBox
            return (
              <g>
                <text x={cx} y={cy - 4} textAnchor="middle" fill={c.text} fontSize={22} fontWeight={700}>{total}</text>
                <text x={cx} y={cy + 14} textAnchor="middle" fill={c.axis} fontSize={11}>{centerCaption}</text>
              </g>
            )
          }} />
        </Pie>
        <Tooltip {...tooltipStyle(mode)} formatter={(v, n) => [`${v} (${total ? Math.round((v / total) * 100) : 0}%)`, n]} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12, color: c.axis }} />
      </PieChart>
    </ChartFrame>
  )
}

// Vertical bar chart, single series (ui.md §8). `layout='vertical'` → horizontal bars.
export function BarCard({ data, dataKey, xKey, color, mode, height = 240, horizontal = false, showLabels = false }) {
  const has = data.some((d) => (d[dataKey] || 0) > 0)
  if (!has) return <div style={{ height }} className="flex items-center justify-center"><EmptyState hint="Chưa có số liệu" /></div>
  if (horizontal) {
    return (
      <ChartFrame height={height}>
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24 }}>
          <CartesianGrid horizontal={false} stroke={CHROME[mode].grid} />
          <XAxis type="number" allowDecimals={false} {...axisProps(mode)} />
          <YAxis type="category" dataKey={xKey} width={78} {...axisProps(mode)} />
          <Tooltip {...tooltipStyle(mode)} cursor={{ fill: CHROME[mode].grid, opacity: 0.35 }} />
          <Bar dataKey={dataKey} fill={color} radius={[0, 4, 4, 0]} isAnimationActive>
            <LabelList dataKey={dataKey} position="right" style={{ fontSize: 11, fill: CHROME[mode].axis }} />
          </Bar>
        </BarChart>
      </ChartFrame>
    )
  }
  return (
    <ChartFrame height={height}>
      <BarChart data={data} margin={{ top: showLabels ? 16 : 4 }}>
        <CartesianGrid vertical={false} stroke={CHROME[mode].grid} />
        <XAxis dataKey={xKey} {...axisProps(mode)} />
        <YAxis allowDecimals={false} {...axisProps(mode)} />
        <Tooltip {...tooltipStyle(mode)} cursor={{ fill: CHROME[mode].grid, opacity: 0.35 }} />
        <Bar dataKey={dataKey} fill={color} radius={[4, 4, 0, 0]} isAnimationActive>
          {showLabels && <LabelList dataKey={dataKey} position="top" style={{ fontSize: 11, fill: CHROME[mode].axis }} />}
        </Bar>
      </BarChart>
    </ChartFrame>
  )
}

// Multi-series line chart for trends over quarter (ui.md §8).
export function LineCard({ data, series, xKey, mode, height = 240 }) {
  const has = data.some((d) => series.some((s) => (d[s.key] || 0) > 0))
  if (!has) return <div style={{ height }} className="flex items-center justify-center"><EmptyState hint="Chưa có số liệu" /></div>
  return (
    <ChartFrame height={height}>
      <LineChart data={data} margin={{ top: 8, right: 16 }}>
        <CartesianGrid stroke={CHROME[mode].grid} />
        <XAxis dataKey={xKey} {...axisProps(mode)} />
        <YAxis allowDecimals={false} {...axisProps(mode)} />
        <Tooltip {...tooltipStyle(mode)} />
        {series.length > 1 && <Legend iconType="plainline" wrapperStyle={{ fontSize: 12, color: CHROME[mode].axis }} />}
        {series.map((s) => (
          <Line key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={s.color}
            strokeWidth={2} dot={{ r: 3, fill: s.color }} activeDot={{ r: 5 }} isAnimationActive />
        ))}
      </LineChart>
    </ChartFrame>
  )
}
