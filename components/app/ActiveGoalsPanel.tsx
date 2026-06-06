import Link from 'next/link'
import { Plus } from 'lucide-react'
import { getCheckinChip } from '@/lib/utils/checkin'
import type { DevelopmentPlan } from '@/lib/db/development-plans'
import { SKILLS, PILLAR_LABELS, type Pillar } from '@/lib/skills'

interface ActiveGoalsPanelProps {
  plans: DevelopmentPlan[]
}

export function ActiveGoalsPanel({ plans }: ActiveGoalsPanelProps) {
  const active = plans
    .filter(p => p.status === 'planned' || p.status === 'in_progress')
    .sort((a, b) => {
      const aChip = getCheckinChip(a)
      const bChip = getCheckinChip(b)
      if (aChip?.color === 'amber' && bChip?.color !== 'amber') return -1
      if (bChip?.color === 'amber' && aChip?.color !== 'amber') return 1
      return 0
    })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>
          Active goals
        </h2>
        {active.length > 0 && (
          <span style={{
            borderRadius: 9999,
            background: 'var(--color-accent-wash2)',
            color: 'var(--color-accent)',
            padding: '2px 8px',
            fontSize: 11.5,
            fontWeight: 600,
          }}>
            {active.length}
          </span>
        )}
      </div>

      {active.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>No active goals yet.</p>
      ) : (
        active.map(plan => <GoalCard key={plan.id} plan={plan} />)
      )}

      <Link
        href="/growth/goal/new"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          marginTop: 4,
          background: 'var(--color-accent-wash)',
          border: '1.5px dashed var(--color-accent-border)',
          borderRadius: 'var(--radius)',
          padding: 14,
          fontSize: 14,
          fontWeight: 500,
          color: 'var(--color-accent)',
          textDecoration: 'none',
        }}
      >
        <Plus size={15} />
        Add a goal
      </Link>
    </div>
  )
}

function GoalCard({ plan }: { plan: DevelopmentPlan }) {
  const skill = SKILLS.find(s => s.key === plan.skill_key)
  const chip = getCheckinChip(plan)

  const chipStyle = chip
    ? chip.color === 'amber'
      ? {
          background: 'var(--color-alert-bg)',
          color: 'var(--color-alert-fg)',
          border: '1px solid var(--color-alert-border)',
        }
      : {
          background: 'var(--color-positive-bg)',
          color: 'var(--color-positive)',
          border: '1px solid transparent',
        }
    : null

  return (
    <Link
      href={`/growth/goal/${plan.id}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius)',
        padding: 15,
        boxShadow: 'var(--shadow-card)',
        textDecoration: 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div>
          <p style={{ fontSize: 13.5, fontWeight: 650, fontFamily: 'var(--font-body)', color: 'var(--color-text-primary)', margin: 0 }}>
            {skill?.label ?? plan.skill_key}
          </p>
          <p style={{ fontSize: 11, color: 'var(--color-text-faint)', margin: '2px 0 0' }}>
            {PILLAR_LABELS[plan.pillar as Pillar] ?? plan.pillar}
          </p>
        </div>
        {chip && chipStyle && (
          <span style={{
            flexShrink: 0,
            borderRadius: 9999,
            padding: '3px 8px',
            fontSize: 11,
            fontWeight: 500,
            ...chipStyle,
          }}>
            {chip.label}
          </span>
        )}
      </div>
      <p style={{ fontSize: 12.5, color: 'var(--color-text-muted)', lineHeight: 1.5, margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
        {plan.goal}
      </p>
      {plan.target_date && (
        <p style={{ fontSize: 11, color: 'var(--color-text-faint)', margin: 0 }}>
          Target {new Date(plan.target_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </p>
      )}
    </Link>
  )
}
