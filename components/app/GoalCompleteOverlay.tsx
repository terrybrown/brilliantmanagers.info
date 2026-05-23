'use client'

import { useEffect, useRef, useState } from 'react'
import Lottie from 'lottie-react'
import Link from 'next/link'
import { getAffirmation } from '@/lib/affirmations'
import { markGoalCompleteAction } from '@/app/(app)/growth/actions'
import type { Pillar } from '@/lib/skills'
import confettiData from '@/public/lottie/confetti.json'

interface GoalCompleteOverlayProps {
  planId: string
  skillLabel: string
  pillar: Pillar
  completedCount: number
  createdAt: string
  evidenceCount: number
  onDismiss: () => void
}

export function GoalCompleteOverlay({
  planId,
  skillLabel,
  pillar,
  completedCount,
  createdAt,
  evidenceCount,
  onDismiss,
}: GoalCompleteOverlayProps) {
  const triggered = useRef(false)

  useEffect(() => {
    if (triggered.current) return
    triggered.current = true
    markGoalCompleteAction(planId).catch(console.error)
  }, [planId])

  const affirmation = getAffirmation(pillar, completedCount)
  // Capture the current timestamp once at mount time (via useState initialiser)
  // so the elapsed calculation is stable across re-renders and avoids the
  // react-hooks/no-impure-calls-in-render rule for Date.now().
  const [nowMs] = useState(() => Date.now())
  const monthsElapsed = Math.round(
    (nowMs - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24 * 30)
  )

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-900/95 px-6 text-center">
      <div className="pointer-events-none absolute inset-0">
        <Lottie animationData={confettiData} loop={false} />
      </div>

      <div className="relative z-10 flex max-w-md flex-col items-center gap-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-amber-400">
          Goal complete
        </p>
        <h2 className="text-3xl font-bold text-white">
          {skillLabel} — <span className="text-amber-400">achieved.</span>
        </h2>
        <p className="text-sm text-slate-300">{affirmation}</p>
        <p className="text-xs text-slate-500">
          {monthsElapsed > 0
            ? `${monthsElapsed} month${monthsElapsed > 1 ? 's' : ''}`
            : 'Less than a month'}{' '}
          · {evidenceCount} evidence {evidenceCount === 1 ? 'entry' : 'entries'}
        </p>

        <div className="mt-4 flex gap-3">
          <Link
            href="/growth"
            onClick={onDismiss}
            className="rounded-lg bg-amber-500 px-5 py-2 text-sm font-semibold text-white hover:bg-amber-400"
          >
            View completed goals →
          </Link>
          <button
            onClick={onDismiss}
            className="rounded-lg border border-slate-600 px-5 py-2 text-sm text-slate-300 hover:text-white"
          >
            Back to Growth
          </button>
        </div>
      </div>
    </div>
  )
}
