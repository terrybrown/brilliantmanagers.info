import Link from 'next/link'
import type { DevelopmentPlan } from '@/lib/db/development-plans'
import { PILLARS, SKILLS } from '@/lib/skills'

interface GrowthSummaryCardProps {
  plans: DevelopmentPlan[]
}

const CARD_STYLE: React.CSSProperties = {
  background: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  boxShadow: 'var(--shadow-card)',
  borderRadius: 10,
  padding: '16px 20px',
}

export function GrowthSummaryCard({ plans }: GrowthSummaryCardProps) {
  const active = plans.filter(p => p.status === 'planned' || p.status === 'in_progress')

  if (active.length === 0) {
    return (
      <div style={CARD_STYLE}>
        <h3 style={{ marginBottom: 4, fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>
          Growth Goals
        </h3>
        <p style={{ marginBottom: 12, fontSize: 12, color: 'var(--color-text-muted)' }}>
          No growth goals yet.
        </p>
        <Link
          href="/growth"
          style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-accent)', textDecoration: 'none' }}
        >
          Explore skills →
        </Link>
      </div>
    )
  }

  const sorted = [...active].sort(
    (a, b) =>
      PILLARS.indexOf(a.pillar as (typeof PILLARS)[number]) -
      PILLARS.indexOf(b.pillar as (typeof PILLARS)[number])
  )
  const top2 = sorted.slice(0, 2)

  return (
    <div style={CARD_STYLE}>
      <h3 style={{ marginBottom: 4, fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>
        Growth Goals
      </h3>
      <p style={{ marginBottom: 8, fontSize: 12, fontWeight: 600, color: 'var(--color-accent)' }}>
        {active.length} active goal{active.length > 1 ? 's' : ''}
      </p>
      <ul style={{ marginBottom: 12, listStyle: 'none', padding: 0, margin: '0 0 12px' }}>
        {top2.map(p => {
          const skill = SKILLS.find(s => s.key === p.skill_key)
          return (
            <li
              key={p.skill_key}
              style={{ fontSize: 12, color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 4 }}
            >
              {skill?.label ?? p.skill_key}
            </li>
          )
        })}
      </ul>
      <Link
        href="/growth"
        style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-accent)', textDecoration: 'none' }}
      >
        View all →
      </Link>
    </div>
  )
}
