'use client'

import { getCheckinChip } from '@/lib/utils/checkin'
import type { DevelopmentPlan } from '@/lib/db/development-plans'

interface ProgressStripProps {
  plan: DevelopmentPlan
}

export function ProgressStrip({ plan }: ProgressStripProps) {
  if (!plan.target_date && !plan.checkin_frequency_weeks) return null

  const now = new Date()
  const chip = getCheckinChip(plan)

  let daysRemaining: number | null = null
  let progressPercent: number | null = null

  if (plan.target_date) {
    const target = new Date(plan.target_date)
    const created = new Date(plan.created_at)
    daysRemaining = Math.max(0, Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    const total = target.getTime() - created.getTime()
    const elapsed = now.getTime() - created.getTime()
    progressPercent = Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)))
  }

  return (
    <div className="flex flex-wrap items-center gap-4 rounded-xl bg-slate-800 px-5 py-4">
      {daysRemaining !== null && (
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold text-white">{daysRemaining}</span>
          <span className="text-sm text-slate-400">days remaining</span>
        </div>
      )}

      {progressPercent !== null && (
        <div className="flex-1 min-w-[120px]">
          <div className="h-2 overflow-hidden rounded-full bg-slate-700">
            <div
              className="h-full rounded-full bg-amber-400 transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-slate-500">{progressPercent}% elapsed</p>
        </div>
      )}

      {chip && (
        <span
          className="rounded-full px-3 py-1 text-xs font-semibold"
          style={
            chip.color === 'amber'
              ? { background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }
              : { background: 'rgba(74,222,128,0.15)', color: '#4ade80' }
          }
        >
          {chip.color === 'green' ? '✓ On track — ' : '⚠ '}{chip.label}
        </span>
      )}
    </div>
  )
}
