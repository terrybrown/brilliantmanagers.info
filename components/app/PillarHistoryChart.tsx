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
  { key: 'overall',          label: 'Overall',   color: '#0E7C6B' },
  { key: 'self',             label: 'Self',       color: '#3b82f6' },
  { key: 'team',             label: 'Team',       color: '#a855f7' },
  { key: 'strategy',         label: 'Strategy',   color: '#22c55e' },
  { key: 'communications',   label: 'Comms',      color: '#f97316' },
  { key: 'domain-expertise', label: 'Expertise',  color: '#06b6d4' },
] as const

const MANAGER_LINES: { key: keyof HistoryPoint; color: string; pillarKey: string }[] = [
  { key: 'mgr_self',               color: '#CC7A1A', pillarKey: 'self' },
  { key: 'mgr_team',               color: '#CC7A1A', pillarKey: 'team' },
  { key: 'mgr_strategy',           color: '#CC7A1A', pillarKey: 'strategy' },
  { key: 'mgr_communications',     color: '#CC7A1A', pillarKey: 'communications' },
  { key: 'mgr_domain-expertise',   color: '#CC7A1A', pillarKey: 'domain-expertise' },
]

interface Props { data: HistoryPoint[] }

export function PillarHistoryChart({ data }: Props) {
  const [activePillars, setActivePillars] = useState<Set<string>>(() => new Set(['overall']))
  const [showManager, setShowManager] = useState(true)

  if (data.length < 2) return null
  // All hook calls are above this guard — safe per Rules of Hooks

  const toggle = (key: string) =>
    setActivePillars(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })

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
        className="mb-3 text-xs"
        style={{
          color: 'var(--color-text-faint)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
        }}
      >
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

        <div style={{ width: 1, height: 18, background: 'var(--color-border)', flexShrink: 0 }} />

        <button
          aria-pressed={showManager}
          onClick={() => setShowManager(v => !v)}
          style={{
            fontSize: 11, fontWeight: 600,
            padding: '3px 10px', borderRadius: 99,
            border: '1px solid #CC7A1A', color: '#CC7A1A',
            background: showManager ? 'rgba(204,122,26,0.12)' : 'transparent',
            opacity: showManager ? 1 : 0.4,
            display: 'flex', alignItems: 'center', gap: 5,
            cursor: 'pointer',
          }}
        >
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#CC7A1A', flexShrink: 0 }} />
          Show Manager Score
        </button>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
          <CartesianGrid stroke="#E2E7DF" />
          <XAxis dataKey="date" tick={{ fill: '#95A097', fontSize: 10 }} />
          <YAxis domain={[1, 5]} tick={{ fill: '#95A097', fontSize: 10 }} />
          <Tooltip
            contentStyle={{ background: '#FFFFFF', border: '1px solid #E2E7DF', borderRadius: 8 }}
            labelStyle={{ color: '#566159', fontSize: 11 }}
            itemStyle={{ fontSize: 11 }}
          />
          <Legend wrapperStyle={{ fontSize: '11px', color: '#95A097' }} />

          {activePillars.has('overall') && (
            <Line type="monotone" dataKey="overall" name="Overall"
              stroke="#0E7C6B" strokeWidth={2.5} dot={{ fill: '#0E7C6B', r: 3 }} />
          )}
          {activePillars.has('overall') && showManager && (
            <Line type="monotone" dataKey="mgr_overall" name="Overall (Mgr)"
              stroke="#CC7A1A" strokeWidth={1.5} strokeDasharray="4 2" dot={false} />
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
