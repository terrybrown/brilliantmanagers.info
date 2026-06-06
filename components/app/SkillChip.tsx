'use client'
import { Lightbulb, Target } from 'lucide-react'

// rgb() values are used directly so jsdom-based tests can read chip.style.color
// These are the computed equivalents of --color-text-muted and --color-accent
const STYLES = {
  opportunity: {
    background: 'rgba(86,97,89,0.10)',
    border: '1px solid rgba(86,97,89,0.25)',
    color: 'rgb(86, 97, 89)',   // --color-text-muted
  },
  goal: {
    background: 'rgba(14,124,107,0.10)',
    border: '1px solid rgba(14,124,107,0.28)',
    color: 'rgb(14, 124, 107)',  // --color-accent
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
