'use client'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { LEVEL_VALUES, type Level } from '@/lib/skills'

interface SkillData {
  label: string
  selfLevel: Level
  managerLevel?: Level
}

interface Props {
  skills: SkillData[]
  showManager: boolean
}

export function SkillBarChart({ skills, showManager }: Props) {
  const data = skills.map(s => ({
    name: s.label,
    Self: LEVEL_VALUES[s.selfLevel],
    Manager: s.managerLevel !== undefined ? LEVEL_VALUES[s.managerLevel] : undefined,
  }))

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 0, right: 0, bottom: 50, left: -10 }}>
        <XAxis
          dataKey="name"
          angle={-35}
          textAnchor="end"
          interval={0}
          tick={{ fontSize: 9, fill: '#64748b' }}
        />
        <YAxis domain={[0, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fontSize: 9, fill: '#64748b' }} />
        <Tooltip
          contentStyle={{
            background: '#1e293b',
            border: 'none',
            borderRadius: '6px',
            fontSize: '11px',
          }}
        />
        {showManager && (
          <Legend wrapperStyle={{ fontSize: '10px', color: '#94a3b8', paddingTop: '8px' }} />
        )}
        <Bar dataKey="Self" fill="#f59e0b" radius={[2, 2, 0, 0]} maxBarSize={12} />
        {showManager && (
          <Bar dataKey="Manager" fill="#3b82f6" radius={[2, 2, 0, 0]} maxBarSize={12} />
        )}
      </BarChart>
    </ResponsiveContainer>
  )
}
