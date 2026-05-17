import Link from 'next/link'
import type { DevelopmentPlan } from '@/lib/db/development-plans'
import { PILLARS, SKILLS } from '@/lib/skills'

interface GrowthSummaryCardProps {
  plans: DevelopmentPlan[]
}

export function GrowthSummaryCard({ plans }: GrowthSummaryCardProps) {
  const active = plans.filter(p => p.status === 'planned' || p.status === 'in_progress')

  if (active.length === 0) {
    return (
      <div className="rounded-xl bg-slate-800 px-5 py-4">
        <h3 className="mb-1 text-sm font-semibold text-white">Growth Goals</h3>
        <p className="mb-3 text-xs text-slate-400">No growth goals yet.</p>
        <Link href="/growth" className="text-xs font-semibold text-amber-400 hover:text-amber-300">
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
    <div className="rounded-xl bg-slate-800 px-5 py-4">
      <h3 className="mb-1 text-sm font-semibold text-white">Growth Goals</h3>
      <p className="mb-2 text-xs font-semibold text-amber-400">
        {active.length} active goal{active.length > 1 ? 's' : ''}
      </p>
      <ul className="mb-3 space-y-1">
        {top2.map(p => {
          const skill = SKILLS.find(s => s.key === p.skill_key)
          return (
            <li key={p.skill_key} className="truncate text-xs text-slate-300">
              {skill?.label ?? p.skill_key}
            </li>
          )
        })}
      </ul>
      <Link href="/growth" className="text-xs font-semibold text-amber-400 hover:text-amber-300">
        View all →
      </Link>
    </div>
  )
}
