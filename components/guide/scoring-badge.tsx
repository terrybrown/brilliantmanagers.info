import { SCORING_LEVEL_COLORS, SCORING_LEVEL_DESCRIPTIONS } from '@/config/scoring'
import type { ScoringLevel } from '@/config/scoring'

interface ScoringBadgeProps {
  level: ScoringLevel
  you?: boolean
}

export function ScoringBadge({ level, you = false }: ScoringBadgeProps) {
  const { color, bg, border } = SCORING_LEVEL_COLORS[level]
  const label = you ? `You · ${level}` : level
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 11.5,
        fontWeight: 700,
        color,
        background: bg,
        border: `1px solid ${border}`,
        padding: '4px 10px',
        borderRadius: 7,
        fontFamily: 'var(--font-body)',
        whiteSpace: 'nowrap',
      }}
      title={SCORING_LEVEL_DESCRIPTIONS[level]}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: color,
          flexShrink: 0,
          display: 'inline-block',
        }}
      />
      {label}
    </span>
  )
}
