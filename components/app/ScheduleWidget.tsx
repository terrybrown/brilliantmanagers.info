'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Pencil, X, Calendar } from 'lucide-react'
import type { ScheduledRound } from '@/lib/db/scheduled-rounds'
import { setScheduledRoundAction, cancelScheduledRoundAction } from '@/app/(app)/dashboard/actions'
import { daysUntil, countdownLabel, googleCalendarUrl } from '@/lib/countdown'

interface ScheduleWidgetProps {
  scheduled: ScheduledRound | null
  showStartNewRound?: boolean
  hasInProgressRound?: boolean
}

export function ScheduleWidget({ scheduled, showStartNewRound = false, hasInProgressRound = false }: ScheduleWidgetProps) {
  const [editing, setEditing] = useState(false)

  if (!scheduled || editing) {
    return (
      <div className="rounded-xl bg-slate-800 px-5 py-4">
        <h3 className="mb-1 text-sm font-semibold text-white">Schedule your next reflection</h3>
        <p className="mb-3 text-xs text-slate-400">
          Set a date to remind yourself to complete your next round.
        </p>
        <form
          action={async (fd: FormData) => {
            await setScheduledRoundAction(fd)
            setEditing(false)
          }}
          className="flex flex-col gap-2"
        >
          <label htmlFor="scheduled_date" className="sr-only">
            Reflection date
          </label>
          <input
            id="scheduled_date"
            name="scheduled_date"
            type="date"
            required
            defaultValue={scheduled?.scheduled_date ?? ''}
            min={new Date().toISOString().slice(0, 10)}
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-amber-400 focus:outline-none"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 rounded-lg bg-amber-500 py-2 text-xs font-semibold text-white hover:bg-amber-400"
            >
              Set date
            </button>
            {editing && (
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-400"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
        {showStartNewRound && (
          <Link
            href="/scorecard"
            className="mt-3 block text-xs font-semibold text-amber-400 hover:text-amber-300"
          >
            {hasInProgressRound ? 'Continue reflection →' : 'Start new round →'}
          </Link>
        )}
      </div>
    )
  }

  const days = daysUntil(scheduled.scheduled_date)
  const label = countdownLabel(days)
  const gcalUrl = googleCalendarUrl(scheduled.scheduled_date)

  return (
    <div className="rounded-xl bg-slate-800 px-5 py-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-white">Next reflection</h3>
          <p className="mt-0.5 text-xs text-slate-400">
            {new Date(scheduled.scheduled_date + 'T00:00:00').toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setEditing(true)}
            aria-label="Edit date"
            className="rounded p-1 text-slate-500 hover:text-slate-300"
          >
            <Pencil size={13} />
          </button>
          <form action={cancelScheduledRoundAction}>
            <button
              type="submit"
              aria-label="Cancel scheduled round"
              className="rounded p-1 text-slate-500 hover:text-red-400"
            >
              <X size={13} />
            </button>
          </form>
        </div>
      </div>

      <div
        className="mb-3 flex items-center gap-2 rounded-lg px-3 py-2"
        style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}
      >
        <Calendar size={14} className="text-amber-400" />
        <span className="text-xs font-semibold text-amber-400">{label}</span>
      </div>

      <div className="flex flex-col gap-1.5">
        <a
          href={gcalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-slate-400 hover:text-white"
        >
          Add to Google Calendar →
        </a>
        <a
          href="/api/export-ical"
          className="text-xs text-slate-400 hover:text-white"
        >
          Download .ics →
        </a>
        {showStartNewRound && (
          <Link
            href="/scorecard"
            className="text-xs font-semibold text-amber-400 hover:text-amber-300"
          >
            {hasInProgressRound ? 'Continue reflection →' : 'Start new round →'}
          </Link>
        )}
      </div>
    </div>
  )
}
