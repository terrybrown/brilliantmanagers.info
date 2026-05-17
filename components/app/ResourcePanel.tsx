'use client'

import { useState } from 'react'
import { ResourceRow } from './ResourceRow'
import type { Resource } from '@/lib/db/resources'

interface ResourcePanelProps {
  skillLabel: string
  resources: Resource[]
  initialPinnedIds?: string[]
  onPinnedChange?: (ids: string[]) => void
}

export function ResourcePanel({ skillLabel, resources, initialPinnedIds = [], onPinnedChange }: ResourcePanelProps) {
  const [showAll, setShowAll] = useState(false)
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set(initialPinnedIds))

  const visible = showAll ? resources : resources.slice(0, 4)

  function toggleResource(resourceId: string) {
    setPinnedIds(prev => {
      const next = new Set(prev)
      if (next.has(resourceId)) next.delete(resourceId)
      else next.add(resourceId)
      onPinnedChange?.([...next])
      return next
    })
  }

  return (
    <div className="rounded-xl bg-slate-800 p-4">
      <h3 className="mb-3 text-sm font-semibold text-white">
        Resources for {skillLabel}
      </h3>

      {resources.length === 0 ? (
        <p className="text-xs text-slate-500">No resources yet — run the seed script to populate.</p>
      ) : (
        <>
          <div className="flex flex-col gap-1">
            {visible.map(r => (
              <ResourceRow
                key={r.id}
                resource={r}
                added={pinnedIds.has(r.id)}
                onToggle={toggleResource}
              />
            ))}
          </div>

          {resources.length > 4 && !showAll && (
            <button
              onClick={() => setShowAll(true)}
              className="mt-2 text-xs text-indigo-400 hover:text-indigo-300"
            >
              Show all {resources.length} →
            </button>
          )}
        </>
      )}
    </div>
  )
}
