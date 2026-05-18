'use client'
import { useState, useCallback } from 'react'
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
  onPillarClick?: (pillar: Pillar) => void
}

const PILLAR_LABEL_TO_KEY: Record<string, Pillar | undefined> = Object.fromEntries(
  Object.entries(PILLAR_LABELS).map(([k, v]) => [v, k as Pillar])
)

export interface ScorecardPillarTickProps {
  x?: number | string
  y?: number | string
  payload?: { value: string }
  textAnchor?: 'middle' | 'start' | 'end' | 'inherit'
  onPillarClick?: (pillar: Pillar) => void
}

export function ScorecardPillarTick({
  x = 0,
  y = 0,
  payload,
  textAnchor = 'middle',
  onPillarClick,
}: ScorecardPillarTickProps) {
  const [hovered, setHovered] = useState(false)
  const label = payload?.value ?? ''
  const pillarKey = PILLAR_LABEL_TO_KEY[label]
  const xNum = Number(x)
  const yNum = Number(y)
  const words = label.split(' ')
  const isTwoLine = words.length === 2
  const rectX = textAnchor === 'end' ? xNum - 64 : textAnchor === 'start' ? xNum : xNum - 32
  const rectHeight = isTwoLine ? 28 : 20
  const fill = hovered ? '#f59e0b' : '#94a3b8'

  return (
    <g
      style={{ cursor: onPillarClick ? 'pointer' : 'default', pointerEvents: 'all' }}
      onClick={() => pillarKey && onPillarClick?.(pillarKey)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <rect x={rectX} y={yNum - rectHeight / 2} width={64} height={rectHeight} fill="transparent" />
      {isTwoLine ? (
        <text x={x} y={y} fill={fill} fontSize={11} textAnchor={textAnchor}>
          <tspan x={x} dy="-7">{words[0]}</tspan>
          <tspan x={x} dy="14">{words[1]}</tspan>
        </text>
      ) : (
        <text x={x} y={y} fill={fill} fontSize={11} textAnchor={textAnchor} dominantBaseline="central">
          {label}
        </text>
      )}
    </g>
  )
}

export function ScorecardRadarChart({ pillarScores, showManager, onPillarClick }: Props) {
  const tickRenderer = useCallback(
    (props: ScorecardPillarTickProps) => <ScorecardPillarTick {...props} onPillarClick={onPillarClick} />,
    [onPillarClick]
  )

  const data = pillarScores.map(ps => ({
    pillar: PILLAR_LABELS[ps.pillar],
    Self: Number(ps.selfScore.toFixed(2)),
    Manager: ps.managerScore !== undefined ? Number(ps.managerScore.toFixed(2)) : undefined,
  }))

  return (
    <div style={{ cursor: 'default' }}>
      <ResponsiveContainer width="100%" height={280}>
        <RadarChart data={data} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
          <PolarGrid stroke="#1e293b" />
          <PolarAngleAxis
            dataKey="pillar"
            tick={tickRenderer}
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
    </div>
  )
}
