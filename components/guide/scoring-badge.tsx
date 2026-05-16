import { SCORING_LEVEL_COLORS, SCORING_LEVEL_DESCRIPTIONS } from '@/config/scoring'
import type { ScoringLevel } from '@/config/scoring'

interface ScoringBadgeProps {
  level: ScoringLevel
}

export function ScoringBadge({ level }: ScoringBadgeProps) {
  const colors = SCORING_LEVEL_COLORS[level]
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${colors.bg} ${colors.text}`}
      title={SCORING_LEVEL_DESCRIPTIONS[level]}
    >
      {level}
    </span>
  )
}
