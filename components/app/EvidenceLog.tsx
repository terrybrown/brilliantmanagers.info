'use client'

import { useState } from 'react'
import { addEvidenceAction } from '@/app/(app)/growth/actions'
import type { GoalEvidence } from '@/lib/db/goal-evidence'
import { trackGoalCheckin } from '@/lib/analytics'

interface EvidenceLogProps {
  planId: string
  entries: GoalEvidence[]
}

export function EvidenceLog({ planId, entries }: EvidenceLogProps) {
  const [showForm, setShowForm] = useState(false)

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Evidence log</h3>
        <button
          onClick={() => setShowForm(v => !v)}
          className="rounded-lg bg-amber-500/20 px-3 py-1 text-xs font-semibold text-amber-400 hover:bg-amber-500/30"
        >
          + Add evidence
        </button>
      </div>

      {showForm && (
        <form
          action={async (fd: FormData) => {
            fd.set('plan_id', planId)
            let succeeded = false
            try {
              await addEvidenceAction(fd)
              succeeded = true
            } catch {
              // addEvidenceAction failed — leave the form open so the user can retry
            }
            if (succeeded) {
              trackGoalCheckin()
              setShowForm(false)
            }
          }}
          className="mb-6 rounded-xl border border-slate-700 bg-slate-800 p-4"
        >
          <div className="mb-3">
            <label htmlFor="what_you_did" className="mb-1 block text-xs font-semibold text-slate-400">
              What did you do?
            </label>
            <textarea
              id="what_you_did"
              name="what_you_did"
              required
              rows={2}
              className="w-full resize-none rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
            />
          </div>
          <div className="mb-3">
            <label htmlFor="impact" className="mb-1 block text-xs font-semibold text-slate-400">
              What was the impact or outcome?
            </label>
            <textarea
              id="impact"
              name="impact"
              required
              rows={2}
              className="w-full resize-none rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
            />
          </div>
          <div className="mb-4">
            <label className="mb-1 block text-xs font-semibold text-slate-400">
              Link (optional)
            </label>
            <input
              type="url"
              name="url"
              placeholder="https://…"
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="rounded-lg bg-amber-500 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-400"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-lg px-4 py-2 text-xs text-slate-400 hover:text-white"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {entries.length === 0 ? (
        <p className="text-sm text-slate-500">No evidence yet. Add your first entry above.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {entries.map(entry => (
            <div
              key={entry.id}
              className="rounded-xl bg-slate-800 px-5 py-4"
              style={{ borderLeft: '3px solid #4ade80' }}
            >
              <p className="mb-1 text-xs text-slate-500">
                {new Date(entry.created_at).toLocaleDateString('en-GB', {
                  day: 'numeric', month: 'short', year: 'numeric',
                })}
              </p>
              <p className="text-sm font-semibold text-white">{entry.what_you_did}</p>
              <p className="mt-1 text-sm text-slate-400">{entry.impact}</p>
              {entry.url && (
                <a
                  href={entry.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 block text-xs text-indigo-400 hover:text-indigo-300"
                >
                  {entry.url} ↗
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
