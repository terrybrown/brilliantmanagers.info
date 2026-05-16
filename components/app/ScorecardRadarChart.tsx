'use client'
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { PILLAR_LABELS, type Pillar } from '@/lib/skills'

interface PillarScore {
  pillar: Pillar
  selfScore: number
  managerScore?: number
}

interface Props {
  pillarScores: PillarScore[]
  showManager: boolean
}

export function ScorecardRadarChart({ pillarScores, showManager }: Props) {
  const data = pillarScores.map(ps => ({
    pillar: PILLAR_LABELS[ps.pillar],
    Self: Number(ps.selfScore.toFixed(2)),
    Manager: ps.managerScore !== undefined ? Number(ps.managerScore.toFixed(2)) : undefined,
  }))

  return (
    <ResponsiveContainer width="100%" height={280}>
      <RadarChart data={data} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
        <PolarGrid stroke="#1e293b" />
        <PolarAngleAxis
          dataKey="pillar"
          tick={{ fill: '#94a3b8', fontSize: 11 }}
        />
        <Radar
          name="Self"
          dataKey="Self"
          stroke="#f59e0b"
          fill="#f59e0b"
          fillOpacity={0.18}
          strokeWidth={2}
        />
        {showManager && (
          <Radar
            name="Manager"
            dataKey="Manager"
            stroke="#3b82f6"
            fill="#3b82f6"
            fillOpacity={0.12}
            strokeWidth={1.5}
            strokeDasharray="4 2"
          />
        )}
        {showManager && (
          <Legend wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />
        )}
      </RadarChart>
    </ResponsiveContainer>
  )
}
