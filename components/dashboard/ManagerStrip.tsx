import Link from 'next/link'
import type { DirectReportRoundSummary } from '@/lib/db/direct-reports'

export type EnrichedDRSummary = DirectReportRoundSummary & {
  userId: string
  name: string
}

interface Props {
  summaries: EnrichedDRSummary[]
}

export function ManagerStrip({ summaries }: Props) {
  if (summaries.length === 0) return null

  return (
    <section id="manager-strip" className="rounded-lg border border-amber-800/40 bg-amber-950/20 p-4 mb-6">
      <h2 className="mb-3 text-sm font-semibold text-amber-400">Your team — action needed</h2>
      <ul className="space-y-2">
        {summaries.map(s => {
          const href = s.roundId
            ? `/manager/${s.userId}?roundId=${s.roundId}`
            : `/manager/${s.userId}`
          return (
            <li key={s.userId} className="flex items-center justify-between gap-4">
              <span className="text-sm">{s.name}</span>
              {s.managerScoringStatus === 'complete' ? (
                <span className="text-xs text-neutral-400">Complete</span>
              ) : (
                <Link
                  href={href}
                  className="rounded-md bg-amber-600 px-3 py-1 text-xs font-medium text-white hover:bg-amber-500 transition-colors"
                >
                  {s.managerScoringStatus === 'not_started' ? 'Score now' : 'Continue scoring'}
                </Link>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
