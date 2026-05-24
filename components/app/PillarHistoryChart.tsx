'use client'
import { useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'

export interface HistoryPoint {
  date: string
  overall: number
  self: number
  team: number
  strategy: number
  communications: number
  'domain-expertise': number
  mgr_overall?: number
  mgr_self?: number
  mgr_team?: number
  mgr_strategy?: number
  mgr_communications?: number
  'mgr_domain-expertise'?: number
}

const TOGGLES = [
  { key: 'overall',          label: 'Overall',   color: '#f59e0b' },
  { key: 'self',             label: 'Self',       color: '#3b82f6' },
  { key: 'team',             label: 'Team',       color: '#a855f7' },
  { key: 'strategy',         label: 'Strategy',   color: '#22c55e' },
  { key: 'communications',   label: 'Comms',      color: '#f97316' },
  { key: 'domain-expertise', label: 'Expertise',  color: '#06b6d4' },
] as const

const MANAGER_LINES: { key: keyof HistoryPoint; color: string; pillarKey: string }[] = [
  { key: 'mgr_self',               color: '#3b82f6', pillarKey: 'self' },
  { key: 'mgr_team',               color: '#a855f7', pillarKey: 'team' },
  { key: 'mgr_strategy',           color: '#22c55e', pillarKey: 'strategy' },
  { key: 'mgr_communications',     color: '#f97316', pillarKey: 'communications' },
  { key: 'mgr_domain-expertise',   color: '#06b6d4', pillarKey: 'domain-expertise' },
]

interface Props { data: HistoryPoint[] }

export function PillarHistoryChart({ data }: Props) {
  const [activePillars, setActivePillars] = useState<Set<string>>(() => new Set(['overall']))
  const [showManager, setShowManager] = useState(true)

  if (data.length < 2) return null

  const toggle = (key: string) =>
    setActivePillars(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })

  return (
    <div className="rounded-xl bg-slate-800 px-4 py-4">
      <p className="mb-3 text-xs text-slate-500" style={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        Score history — all rounds
      </p>

      {/* Toggle controls */}
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        {TOGGLES.map(({ key, label, color }) => {
          const on = activePillars.has(key)
          return (
            <button
              key={key}
              aria-pressed={on}
              onClick={() => toggle(key)}
              style={{
                fontSize: 11, fontWeight: 600,
                padding: '3px 10px', borderRadius: 99,
                border: `1px solid ${color}`, color,
                background: on ? `${color}26` : 'transparent',
                opacity: on ? 1 : 0.4,
                cursor: 'pointer',
              }}
            >
              {label}
            </button>
          )
        })}

        <div style={{ width: 1, height: 18, background: '#334155', flexShrink: 0 }} />

        <button
          aria-pressed={showManager}
          onClick={() => setShowManager(v => !v)}
          style={{
            fontSize: 11, fontWeight: 600,
            padding: '3px 10px', borderRadius: 99,
            border: '1px solid #a78bfa', color: '#a78bfa',
            background: showManager ? 'rgba(167,139,250,0.15)' : 'transparent',
            opacity: showManager ? 1 : 0.4,
            display: 'flex', alignItems: 'center', gap: 5,
            cursor: 'pointer',
          }}
        >
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#a78bfa', flexShrink: 0 }} />
          Show Manager Score
        </button>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
          <CartesianGrid stroke="#1e293b" />
          <XAxis dataKey="date" tick={{ fill: '#475569', fontSize: 10 }} />
          <YAxis domain={[1, 5]} tick={{ fill: '#475569', fontSize: 10 }} />
          <Tooltip
            contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8 }}
            labelStyle={{ color: '#94a3b8', fontSize: 11 }}
            itemStyle={{ fontSize: 11 }}
          />
          <Legend wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />

          {activePillars.has('overall') && (
            <Line type="monotone" dataKey="overall" name="Overall"
              stroke="#f59e0b" strokeWidth={2.5} dot={{ fill: '#f59e0b', r: 3 }} />
          )}
          {activePillars.has('overall') && showManager && (
            <Line type="monotone" dataKey="mgr_overall" name="Overall (Mgr)"
              stroke="#a78bfa" strokeWidth={1.5} strokeDasharray="4 2" dot={false} />
          )}

          {TOGGLES.slice(1).map(({ key, label, color }) =>
            activePillars.has(key) ? (
              <Line key={key} type="monotone" dataKey={key} name={label}
                stroke={color} strokeWidth={1} dot={false} />
            ) : null
          )}

          {showManager && MANAGER_LINES.map(({ key, color, pillarKey }) =>
            activePillars.has(pillarKey) ? (
              <Line key={String(key)} type="monotone" dataKey={key as string} name={`${pillarKey} (Mgr)`}
                stroke={color} strokeWidth={1} strokeDasharray="4 2" dot={false} opacity={0.6} />
            ) : null
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
