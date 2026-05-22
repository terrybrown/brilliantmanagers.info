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
import { PILLAR_LABELS, LEVELS, type Pillar, type Level } from '@/lib/skills'
import type { RadarPillarScore, SkillScore } from '@/lib/reflections'

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

function levelName(score: number): Level {
  const idx = Math.min(4, Math.max(0, Math.round(score) - 1))
  return LEVELS[idx]
}

function SkillRow({ skill }: { skill: SkillScore }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        padding: '2px 0',
        color: '#94a3b8',
        borderBottom: '1px solid #0f172a',
        fontSize: 11,
      }}
    >
      <span>{skill.label}</span>
      <span style={{ color: '#e2e8f0' }}>{skill.level}</span>
    </div>
  )
}

export interface PillarTooltipProps {
  pillarScore: RadarPillarScore
  hidden: Set<'Self' | 'Manager'>
}

export function PillarTooltip({ pillarScore, hidden }: PillarTooltipProps) {
  const { pillar, selfScore, selfScored, selfSkills, managerScore, managerSkills } = pillarScore
  const hasManager = managerScore !== undefined && managerSkills !== undefined
  const showSelf = !hidden.has('Self')
  const showManager = hasManager && !hidden.has('Manager')

  // Narrowed locals — only used inside the showManager block where hasManager is guaranteed true
  const mScore = hasManager ? managerScore : undefined
  const mSkills = hasManager ? managerSkills : undefined

  return (
    <div
      style={{
        background: '#1e293b',
        border: '1px solid #334155',
        borderRadius: 8,
        padding: '10px 14px',
        fontSize: 12,
        maxWidth: 240,
      }}
    >
      <div style={{ fontWeight: 600, color: '#f1f5f9', marginBottom: 8, fontSize: 13 }}>
        {PILLAR_LABELS[pillar]}
      </div>

      {showSelf && (
        <div style={{ marginBottom: showManager ? 10 : 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <div style={{ width: 10, height: 2, background: '#f59e0b', borderRadius: 1 }} />
            <span style={{ color: '#fbbf24', fontWeight: 600 }}>Self</span>
            {selfScored ? (
              <>
                <span
                  style={{
                    background: 'rgba(245,158,11,.15)',
                    color: '#fbbf24',
                    padding: '1px 5px',
                    borderRadius: 3,
                    fontSize: 10,
                  }}
                >
                  {`${Math.round(selfScore)} / 5`}
                </span>
                <span
                  style={{
                    background: '#0f172a',
                    color: '#64748b',
                    padding: '1px 4px',
                    borderRadius: 3,
                    fontSize: 10,
                  }}
                >
                  {levelName(selfScore)}
                </span>
              </>
            ) : (
              <span style={{ color: '#475569', fontSize: 10 }}>Not scored</span>
            )}
          </div>
          {selfSkills.map(skill => (
            <SkillRow key={skill.skillKey} skill={skill} />
          ))}
        </div>
      )}

      {showManager && mScore !== undefined && mSkills !== undefined && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <div
              style={{
                width: 10,
                height: 2,
                background:
                  'repeating-linear-gradient(90deg, #a78bfa 0, #a78bfa 4px, transparent 4px, transparent 7px)',
              }}
            />
            <span style={{ color: '#c4b5fd', fontWeight: 600 }}>Manager</span>
            <span
              style={{
                background: 'rgba(167,139,250,.15)',
                color: '#c4b5fd',
                padding: '1px 5px',
                borderRadius: 3,
                fontSize: 10,
              }}
            >
              {`${Math.round(mScore)} / 5`}
            </span>
            <span
              style={{
                background: '#0f172a',
                color: '#64748b',
                padding: '1px 4px',
                borderRadius: 3,
                fontSize: 10,
              }}
            >
              {levelName(mScore)}
            </span>
          </div>
          {mSkills.map(skill => (
            <SkillRow key={skill.skillKey} skill={skill} />
          ))}
        </div>
      )}
    </div>
  )
}

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
  // Only "Domain Expertise" has two words among current pillar labels; update if PILLAR_LABELS gains multi-word entries
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
        <text x={x} y={y} fill={fill} fontSize={11} textAnchor={textAnchor} dominantBaseline="central">
          <tspan x={x} dy={-7}>{words[0]}</tspan>
          <tspan x={x} dy={14}>{words[1]}</tspan>
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
              stroke="#a78bfa"
              fill="#a78bfa"
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
