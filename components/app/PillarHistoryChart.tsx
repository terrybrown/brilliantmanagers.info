'use client'
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

export interface HistoryPoint {
  date: string
  overall: number
  self: number
  team: number
  strategy: number
  communications: number
  'domain-expertise': number
}

const PILLAR_LINES: { key: keyof HistoryPoint; label: string; color: string }[] = [
  { key: 'self', label: 'Self', color: '#3b82f6' },
  { key: 'team', label: 'Team', color: '#a855f7' },
  { key: 'strategy', label: 'Strategy', color: '#22c55e' },
  { key: 'communications', label: 'Comms', color: '#f97316' },
  { key: 'domain-expertise', label: 'Expertise', color: '#06b6d4' },
]

interface PillarHistoryChartProps {
  data: HistoryPoint[]
}

export function PillarHistoryChart({ data }: PillarHistoryChartProps) {
  if (data.length < 2) return null

  return (
    <div className="rounded-xl bg-slate-800 px-4 py-4">
      <p
        className="mb-3 text-xs text-slate-500"
        style={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}
      >
        Score history — all rounds
      </p>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
          <CartesianGrid stroke="#1e293b" />
          <XAxis dataKey="date" tick={{ fill: '#475569', fontSize: 10 }} />
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
            dataKey="overall"
            name="Overall"
            stroke="#f59e0b"
            strokeWidth={2.5}
            dot={{ fill: '#f59e0b', r: 3 }}
          />
          {PILLAR_LINES.map(({ key, label, color }) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              name={label}
              stroke={color}
              strokeWidth={1}
              strokeDasharray="4 2"
              dot={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
