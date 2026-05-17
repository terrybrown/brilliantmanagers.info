'use client'
import { Lightbulb, Target } from 'lucide-react'

// rgb() values are used directly so jsdom-based tests can read chip.style.color
// These are the computed equivalents of #a5b4fc (indigo-300) and #f59e0b (amber-500)
const STYLES = {
  opportunity: {
    background: 'rgba(99,102,241,0.12)',
    border: '1px solid rgba(99,102,241,0.35)',
    color: 'rgb(165, 180, 252)',
  },
  goal: {
    background: 'rgba(245,158,11,0.12)',
    border: '1px solid rgba(245,158,11,0.35)',
    color: 'rgb(245, 158, 11)',
  },
}

interface SkillChipProps {
  type: 'opportunity' | 'goal'
  label: string
  size?: 'sm' | 'md'
}

export function SkillChip({ type, label, size = 'sm' }: SkillChipProps) {
  const Icon = type === 'opportunity' ? Lightbulb : Target
  const iconSize = size === 'md' ? 14 : 12
  return (
    <span
      style={STYLES[type]}
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${size === 'md' ? 'text-sm' : 'text-xs'}`}
    >
      <Icon size={iconSize} strokeWidth={1.75} />
      {label}
    </span>
  )
}
