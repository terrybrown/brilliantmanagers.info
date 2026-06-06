'use client'

import { useState } from 'react'
import { CheckCircle } from 'lucide-react'
import { GoalCompleteOverlay } from './GoalCompleteOverlay'
import { ResourceRow } from './ResourceRow'
import { addGoalResourceAction, removeGoalResourceAction } from '@/app/(app)/growth/actions'
import { useMutation } from '@/hooks/use-mutation'
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
  const { mutate: mutateResource } = useMutation()

  function toggleResource(resourceId: string) {
    const next = new Set(pinnedIds)
    if (next.has(resourceId)) {
      next.delete(resourceId)
      setPinnedIds(next)
      mutateResource(() => removeGoalResourceAction(plan.id, resourceId))
    } else {
      next.add(resourceId)
      setPinnedIds(next)
      mutateResource(() => addGoalResourceAction(plan.id, resourceId))
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
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 16px',
            borderRadius: 8,
            border: '1px solid var(--color-positive-border)',
            background: 'transparent',
            color: 'var(--color-positive)',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <CheckCircle size={15} strokeWidth={1.75} />
          Mark complete
        </button>

        <button
          onClick={() => setShowBrowse(v => !v)}
          style={{ fontSize: 12, color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left' }}
        >
          {showBrowse ? 'Hide resources' : 'Browse all resources'}
        </button>
      </div>

      {showBrowse && skillResources.length > 0 && (
        <div style={{ marginTop: 16, background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 10, padding: 16 }}>
          <h4 style={{ marginBottom: 12, marginTop: 0, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-faint)' }}>
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
