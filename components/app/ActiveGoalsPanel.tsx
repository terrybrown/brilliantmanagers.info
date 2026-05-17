'use client'

import Link from 'next/link'
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
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold text-white">Active Goals</h2>
        {active.length > 0 && (
          <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-semibold text-amber-400">
            {active.length}
          </span>
        )}
      </div>

      {active.length === 0 ? (
        <p className="text-sm text-slate-500">No active goals yet.</p>
      ) : (
        active.map(plan => <GoalCard key={plan.id} plan={plan} />)
      )}

      <Link
        href="/growth/goal/new"
        className="mt-1 flex items-center justify-center rounded-xl border border-dashed border-indigo-500/40 px-4 py-3 text-sm font-medium text-indigo-400 hover:border-indigo-400 hover:text-indigo-300"
      >
        + Add a goal
      </Link>
    </div>
  )
}

function GoalCard({ plan }: { plan: DevelopmentPlan }) {
  const skill = SKILLS.find(s => s.key === plan.skill_key)
  const chip = getCheckinChip(plan)

  return (
    <Link
      href={`/growth/goal/${plan.id}`}
      className="flex flex-col gap-2 rounded-xl bg-slate-800 px-4 py-3 hover:bg-slate-700"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-white">{skill?.label ?? plan.skill_key}</p>
          <p className="text-xs text-slate-500">
            {PILLAR_LABELS[plan.pillar as Pillar] ?? plan.pillar}
          </p>
        </div>
        {chip && (
          <span
            className="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium"
            style={
              chip.color === 'amber'
                ? { background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }
                : { background: 'rgba(74,222,128,0.15)', color: '#4ade80' }
            }
          >
            {chip.label}
          </span>
        )}
      </div>
      <p className="line-clamp-2 text-xs text-slate-400">{plan.goal}</p>
      {plan.target_date && (
        <p className="text-xs text-slate-600">
          Target: {new Date(plan.target_date).toLocaleDateString()}
        </p>
      )}
    </Link>
  )
}
