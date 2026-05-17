'use client'

import { useState } from 'react'
import { GoalCompleteOverlay } from './GoalCompleteOverlay'
import { ResourceRow } from './ResourceRow'
import { addGoalResourceAction, removeGoalResourceAction } from '@/app/(app)/growth/actions'
import type { DevelopmentPlan } from '@/lib/db/development-plans'
import type { Resource } from '@/lib/db/resources'
import type { GoalResource } from '@/lib/db/goal-resources'
import type { Pillar } from '@/lib/skills'

interface GoalDetailClientProps {
  plan: DevelopmentPlan
  skillLabel: string
  pillar: Pillar
  completedCount: number
  evidenceCount: number
  skillResources: Resource[]
  goalResources: GoalResource[]
}

export function GoalDetailClient({
  plan,
  skillLabel,
  pillar,
  completedCount,
  evidenceCount,
  skillResources,
  goalResources,
}: GoalDetailClientProps) {
  const [showCelebration, setShowCelebration] = useState(false)
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(
    new Set(goalResources.map(gr => gr.resource_id))
  )
  const [showBrowse, setShowBrowse] = useState(false)

  async function toggleResource(resourceId: string) {
    const next = new Set(pinnedIds)
    if (next.has(resourceId)) {
      next.delete(resourceId)
      setPinnedIds(next)
      await removeGoalResourceAction(plan.id, resourceId)
    } else {
      next.add(resourceId)
      setPinnedIds(next)
      await addGoalResourceAction(plan.id, resourceId)
    }
  }

  return (
    <>
      {showCelebration && (
        <GoalCompleteOverlay
          planId={plan.id}
          skillLabel={skillLabel}
          pillar={pillar}
          completedCount={completedCount}
          createdAt={plan.created_at}
          evidenceCount={evidenceCount}
          onDismiss={() => setShowCelebration(false)}
        />
      )}

      <div className="flex flex-col gap-2">
        <button
          onClick={() => setShowCelebration(true)}
          className="rounded-lg border border-green-500/40 px-4 py-2 text-sm font-semibold text-green-400 hover:border-green-400 hover:bg-green-500/10"
        >
          Mark complete ✓
        </button>

        <button
          onClick={() => setShowBrowse(v => !v)}
          className="text-xs text-slate-500 hover:text-slate-300"
        >
          {showBrowse ? 'Hide resources' : 'Browse all resources'}
        </button>
      </div>

      {showBrowse && skillResources.length > 0 && (
        <div className="mt-4 rounded-xl border border-slate-700 bg-slate-800/50 p-4">
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Browse all resources
          </h4>
          <div className="flex flex-col gap-1">
            {skillResources.map(r => (
              <ResourceRow
                key={r.id}
                resource={r}
                added={pinnedIds.has(r.id)}
                onToggle={toggleResource}
              />
            ))}
          </div>
        </div>
      )}
    </>
  )
}
