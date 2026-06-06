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
    <div
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 10,
        boxShadow: 'var(--shadow-card)',
        padding: '18px 20px',
      }}
    >
      <p
        style={{
          fontSize: 13.5,
          fontWeight: 700,
          fontFamily: 'var(--font-display)',
          color: 'var(--color-text-primary)',
          marginBottom: 4,
        }}
      >
        {TABS.find(t => t.id === activeTab)?.label ?? 'Overall'} trend
      </p>
      <p style={{ fontSize: 11, color: 'var(--color-text-faint)', marginBottom: 12 }}>
        Self vs. manager · all rounds
      </p>

      {/* Tab bar */}
      <div style={{ marginBottom: 16, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '4px 10px',
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
              background: activeTab === tab.id ? 'var(--color-accent-wash2)' : 'var(--color-chip-bg)',
              color: activeTab === tab.id ? 'var(--color-accent)' : 'var(--color-text-muted)',
              border: activeTab === tab.id ? '1px solid var(--color-accent-border)' : '1px solid transparent',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
          <CartesianGrid stroke="#E2E7DF" />
          <XAxis dataKey="label" tick={{ fill: '#95A097', fontSize: 10 }} />
          <YAxis domain={[1, 5]} tick={{ fill: '#95A097', fontSize: 10 }} />
          <Tooltip
            contentStyle={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 8,
            }}
            labelStyle={{ color: 'var(--color-text-muted)', fontSize: 11 }}
            itemStyle={{ fontSize: 11 }}
          />
          <Legend wrapperStyle={{ fontSize: '11px', color: 'var(--color-text-muted)' }} />
          <Line
            type="monotone"
            dataKey={activeTab}
            name="You"
            stroke="#0E7C6B"
            strokeWidth={2.5}
            dot={{ fill: '#0E7C6B', r: 3 }}
          />
          {hasMgr && (
            <Line
              type="monotone"
              dataKey={mgrKey}
              name="Manager"
              stroke="#CC7A1A"
              strokeWidth={2}
              strokeDasharray="6 3"
              dot={{ fill: '#CC7A1A', r: 3 }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
