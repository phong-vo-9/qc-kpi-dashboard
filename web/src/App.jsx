import { useEffect, useState, useCallback } from 'react'
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'

const COLORS = ['#2563eb', '#16a34a', '#f59e0b', '#dc2626', '#7c3aed']
const api = (path, opts) => fetch(path, opts).then((r) => r.json())
const query = (f) => new URLSearchParams(Object.fromEntries(Object.entries(f).filter(([, v]) => v))).toString()

function Card({ label, value, accent }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border p-4">
      <div className="text-sm text-gray-500">{label}</div>
      <div className={`text-3xl font-bold ${accent || 'text-gray-800'}`}>{value}</div>
    </div>
  )
}

function Panel({ title, children }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border p-4">
      <h3 className="font-semibold text-gray-700 mb-3">{title}</h3>
      {children}
    </div>
  )
}

function Select({ label, value, onChange, options }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-gray-500">{label}</span>
      <select value={value} onChange={onChange} className="border rounded-lg px-3 py-1.5 bg-white">
        <option value="">Tất cả</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  )
}

function RatioRow({ label, count, ratio }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b last:border-0">
      <span className="text-gray-600">{label}</span>
      <span className="text-sm"><b>{count}</b> <span className="text-gray-400">({ratio})</span></span>
    </div>
  )
}

function PieBlock({ title, data }) {
  const has = data.some((d) => d.value > 0)
  return (
    <Panel title={title}>
      <div style={{ width: '100%', height: 220 }}>
        {has ? (
          <ResponsiveContainer>
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" outerRadius={80} label>
                {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-gray-400 text-sm flex items-center justify-center h-full">Không có dữ liệu</div>
        )}
      </div>
    </Panel>
  )
}

function BarBlock({ title, data, dataKey, xKey }) {
  return (
    <Panel title={title}>
      <div style={{ width: '100%', height: 240 }}>
        <ResponsiveContainer>
          <BarChart data={data}>
            <XAxis dataKey={xKey} tick={{ fontSize: 12 }} />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey={dataKey} fill="#2563eb" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  )
}

const Check = ({ ok }) => <span className={ok ? 'text-green-600' : 'text-gray-300'}>{ok ? '✔' : '✖'}</span>

export default function App() {
  const [filters, setFilters] = useState({ project: '', year: '', quarter: '' })
  const [options, setOptions] = useState({ projects: [], years: [], quarters: [] })
  const [kpi, setKpi] = useState(null)
  const [tasks, setTasks] = useState([])
  const [meta, setMeta] = useState({})
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    const q = query(filters)
    const [k, t, o, m] = await Promise.all([
      api(`/api/kpi?${q}`), api(`/api/tasks?${q}`), api('/api/filters'), api('/api/meta'),
    ])
    setKpi(k); setTasks(t); setOptions(o); setMeta(m)
  }, [filters])

  useEffect(() => { load() }, [load])

  const refresh = async () => {
    setLoading(true)
    try {
      const r = await api('/api/refresh' + (filters.project ? `?project=${filters.project}` : ''), { method: 'POST' })
      if (r.error) alert('Lỗi đồng bộ Jira:\n' + r.error)
      await load()
    } catch (e) {
      alert('Không kết nối được backend: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  const set = (k) => (e) => setFilters((f) => ({ ...f, [k]: e.target.value }))

  if (!kpi) return <div className="p-8 text-gray-500">Đang tải…</div>

  const reviewPie = [
    { name: 'Review1', value: kpi.review.r1 },
    { name: 'Review2', value: kpi.review.r2 },
    { name: 'Review3', value: kpi.review.r3 },
  ]
  const tcPie = [
    { name: 'TC1', value: kpi.testCase.tc1 },
    { name: 'TC2', value: kpi.testCase.tc2 },
    { name: 'TC3', value: kpi.testCase.tc3 },
  ]
  const tdPie = [
    { name: 'TD1', value: kpi.testDesign.td1 },
    { name: 'TD2', value: kpi.testDesign.td2 },
    { name: 'TD3', value: kpi.testDesign.td3 },
  ]

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">QC KPI Dashboard</h1>
            <p className="text-xs text-gray-400">
              {meta.lastRefresh
                ? `Đồng bộ lần cuối: ${new Date(meta.lastRefresh).toLocaleString('vi-VN')}`
                : 'Chưa đồng bộ'}
            </p>
          </div>
          <button
            onClick={refresh}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50"
          >
            {loading ? 'Đang đồng bộ…' : '↻ Refresh'}
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <Select label="Project" value={filters.project} onChange={set('project')} options={options.projects} />
          <Select label="Year" value={filters.year} onChange={set('year')} options={options.years} />
          <Select label="Quarter" value={filters.quarter} onChange={set('quarter')} options={options.quarters} />
        </div>

        {/* Overview cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card label="Tổng Task" value={kpi.total} accent="text-blue-600" />
          <Card label="Tổng Review" value={kpi.totalReview} accent="text-green-600" />
          <Card label="Tổng Test Case" value={kpi.totalTestCase} accent="text-amber-600" />
          <Card label="Tổng Test Design" value={kpi.totalTestDesign} accent="text-purple-600" />
          <Card label="Tổng QC Weight" value={kpi.qcWeight.total} accent="text-indigo-600" />
          <Card label="Tổng Bug" value={kpi.totalBug} accent="text-red-600" />
        </div>

        {/* Detail: counts + ratio per Task */}
        <div className="grid md:grid-cols-3 gap-4">
          <Panel title="Review">
            <RatioRow label="Review1" count={kpi.review.r1} ratio={kpi.ratios.r1} />
            <RatioRow label="Review2" count={kpi.review.r2} ratio={kpi.ratios.r2} />
            <RatioRow label="Review3" count={kpi.review.r3} ratio={kpi.ratios.r3} />
          </Panel>
          <Panel title="Test Case">
            <RatioRow label="TC1" count={kpi.testCase.tc1} ratio={kpi.ratios.tc1} />
            <RatioRow label="TC2" count={kpi.testCase.tc2} ratio={kpi.ratios.tc2} />
            <RatioRow label="TC3" count={kpi.testCase.tc3} ratio={kpi.ratios.tc3} />
          </Panel>
          <Panel title="Test Design">
            <RatioRow label="TD1" count={kpi.testDesign.td1} ratio={kpi.ratios.td1} />
            <RatioRow label="TD2" count={kpi.testDesign.td2} ratio={kpi.ratios.td2} />
            <RatioRow label="TD3" count={kpi.testDesign.td3} ratio={kpi.ratios.td3} />
          </Panel>
        </div>

        {/* QC Weight summary + by quarter */}
        <div className="grid md:grid-cols-2 gap-4">
          <Panel title="QC Weight">
            <div className="flex gap-10">
              <div>
                <div className="text-sm text-gray-500">Total</div>
                <div className="text-2xl font-bold">{kpi.qcWeight.total}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Average</div>
                <div className="text-2xl font-bold">{kpi.qcWeight.average}</div>
              </div>
            </div>
          </Panel>
          <BarBlock title="QC Weight theo Quarter" data={kpi.qcWeight.byQuarter} dataKey="weight" xKey="quarter" />
        </div>

        {/* Pie charts */}
        <div className="grid md:grid-cols-3 gap-4">
          <PieBlock title="Review" data={reviewPie} />
          <PieBlock title="Test Case" data={tcPie} />
          <PieBlock title="Test Design" data={tdPie} />
        </div>

        {/* Top-5 bar charts */}
        <div className="grid md:grid-cols-2 gap-4">
          <BarBlock title="Top 5 Task nhiều Bug nhất" data={kpi.topBug} dataKey="bug" xKey="key" />
          <BarBlock title="Top 5 Task QC Weight cao nhất" data={kpi.qcWeight.top5} dataKey="weight" xKey="key" />
        </div>

        {/* Task table */}
        <Panel title={`Danh sách Task (${tasks.length})`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="py-2 pr-4">Task</th>
                  <th className="pr-4">Summary</th>
                  <th className="pr-4">Status</th>
                  <th className="px-2 text-center" colSpan={3}>Review</th>
                  <th className="px-2 text-center" colSpan={3}>Test Case</th>
                  <th className="px-2 text-center" colSpan={3}>Test Design</th>
                  <th className="px-2 text-right">QC Weight</th>
                  <th className="px-2 text-right">Bug</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((t) => (
                  <tr key={t.key} className="border-b hover:bg-gray-50">
                    <td className="py-2 pr-4 font-medium text-blue-600">{t.key}</td>
                    <td className="pr-4 max-w-xs truncate" title={t.summary}>{t.summary}</td>
                    <td className="pr-4"><span className="text-xs bg-gray-100 rounded px-2 py-0.5">{t.status}</span></td>
                    <td className="text-center"><Check ok={t.review1} /></td>
                    <td className="text-center"><Check ok={t.review2} /></td>
                    <td className="text-center"><Check ok={t.review3} /></td>
                    <td className="text-center"><Check ok={t.tc1} /></td>
                    <td className="text-center"><Check ok={t.tc2} /></td>
                    <td className="text-center"><Check ok={t.tc3} /></td>
                    <td className="text-center"><Check ok={t.td1} /></td>
                    <td className="text-center"><Check ok={t.td2} /></td>
                    <td className="text-center"><Check ok={t.td3} /></td>
                    <td className="text-right pr-2">{t.qcWeight}</td>
                    <td className="text-right pr-2">{t.bugCount}</td>
                  </tr>
                ))}
                {tasks.length === 0 && (
                  <tr>
                    <td colSpan={14} className="text-center text-gray-400 py-6">
                      Chưa có dữ liệu — bấm Refresh để đồng bộ từ Jira
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Panel>
      </main>
    </div>
  )
}
