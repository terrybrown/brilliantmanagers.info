'use client'
import { useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import type { TrendPoint } from '@/lib/reflections'

type Tab = 'overall' | 'self' | 'team' | 'strategy' | 'communications' | 'domain-expertise'

const TABS: { id: Tab; label: string }[] = [
  { id: 'overall', label: 'Overall' },
  { id: 'self', label: 'Self' },
  { id: 'team', label: 'Team' },
  { id: 'strategy', label: 'Strategy' },
  { id: 'communications', label: 'Comms' },
  { id: 'domain-expertise', label: 'Expertise' },
]

const MGR_KEY_MAP = {
  overall: 'mgr_overall',
  self: 'mgr_self',
  team: 'mgr_team',
  strategy: 'mgr_strategy',
  communications: 'mgr_communications',
  'domain-expertise': 'mgr_domain-expertise',
} as const satisfies Record<Tab, keyof TrendPoint>

interface ReflectionsTrendChartProps {
  data: TrendPoint[]
}

export function ReflectionsTrendChart({ data }: ReflectionsTrendChartProps) {
  const [activeTab, setActiveTab] = useState<Tab>('overall')

  if (data.length === 0) return null

  const mgrKey = MGR_KEY_MAP[activeTab]
  const hasMgr = data.some(p => p[mgrKey] !== undefined)

  return (
    <div className="rounded-xl bg-slate-800 px-4 py-4">
      <p
        className="mb-3 text-xs text-slate-500"
        style={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}
      >
        Score history
      </p>

      {/* Tab bar */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '4px 10px',
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              background: activeTab === tab.id ? '#f59e0b' : 'rgba(255,255,255,0.06)',
              color: activeTab === tab.id ? '#1a2a3a' : '#94a3b8',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
          <CartesianGrid stroke="#1e293b" />
          <XAxis dataKey="label" tick={{ fill: '#475569', fontSize: 10 }} />
          <YAxis domain={[1, 5]} tick={{ fill: '#475569', fontSize: 10 }} />
          <Tooltip
            contentStyle={{
              background: '#0f172a',
              border: '1px solid #1e293b',
              borderRadius: 8,
            }}
            labelStyle={{ color: '#94a3b8', fontSize: 11 }}
            itemStyle={{ fontSize: 11 }}
          />
          <Legend wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />
          <Line
            type="monotone"
            dataKey={activeTab}
            name="You"
            stroke="#f59e0b"
            strokeWidth={2.5}
            dot={{ fill: '#f59e0b', r: 3 }}
          />
          {hasMgr && (
            <Line
              type="monotone"
              dataKey={mgrKey}
              name="Manager"
              stroke="#a78bfa"
              strokeWidth={2}
              strokeDasharray="6 3"
              dot={{ fill: '#a78bfa', r: 3 }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
