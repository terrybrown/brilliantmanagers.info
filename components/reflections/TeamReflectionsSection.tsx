import Link from 'next/link'
import type { TeamMemberSummary } from '@/lib/db/direct-reports'

/** @deprecated Use TeamMemberSummary — removed after TeamReflectionsSection migration */
type TeamReflectionSummary = TeamMemberSummary

type EnrichedSummary = TeamReflectionSummary & { name: string }

const STATUS_LABEL: Record<string, string> = {
  not_started: 'Needs scoring',
  in_progress: 'Scoring in progress',
  complete: 'Scored',
}

export function TeamReflectionsSection({ summaries }: { summaries: EnrichedSummary[] }) {
  if (summaries.length === 0) return null

  return (
    <section className="mt-8">
      <h2 className="mb-4 text-lg font-semibold">Your team&apos;s reflections</h2>
      <ul className="space-y-3">
        {summaries.map(s => {
          // Use the most recent round that is not fully scored, falling back to the first round.
          const activeRound = s.rounds.find(r => r.managerScoringStatus !== 'complete') ?? s.rounds[0]
          const managerScoringStatus = activeRound?.managerScoringStatus ?? 'not_started'
          const roundId = activeRound?.roundId ?? null

          return (
            <li
              key={s.directReportId}
              className="flex items-center justify-between gap-4 rounded-lg border border-neutral-800 p-4"
            >
              <div>
                <p className="text-sm font-medium">{s.name}</p>
                <p className="text-xs text-neutral-400 mt-0.5">{STATUS_LABEL[managerScoringStatus]}</p>
              </div>
              {managerScoringStatus !== 'complete' && roundId && (
                <Link
                  href={`/manager/${s.directReportId}?roundId=${roundId}`}
                  className="flex-shrink-0 rounded-md bg-amber-600 px-3 py-1 text-xs font-medium text-white hover:bg-amber-500 transition-colors"
                >
                  {managerScoringStatus === 'not_started' ? 'Score now' : 'Continue scoring'}
                </Link>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
