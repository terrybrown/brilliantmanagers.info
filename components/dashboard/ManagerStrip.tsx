import Link from 'next/link'
import type { DirectReportRoundSummary } from '@/lib/db/direct-reports'
import type { ManagerScoringStatus } from '@/lib/db/manager-scores'

export type EnrichedDRSummary = DirectReportRoundSummary & {
  userId: string
  name: string
}

interface Props {
  summaries: EnrichedDRSummary[]
}

const STATE_COLORS: Record<ManagerScoringStatus, { border: string; bar: string; text: string }> = {
  not_started: {
    border: 'border-amber-600/50',
    bar: 'bg-amber-500',
    text: 'text-amber-400',
  },
  in_progress: {
    border: 'border-blue-600/50',
    bar: 'bg-blue-500',
    text: 'text-blue-400',
  },
  complete: {
    border: 'border-green-800/40',
    bar: 'bg-green-600',
    text: 'text-green-500',
  },
}

function DrCard({ s }: { s: EnrichedDRSummary }) {
  const { border, bar, text } = STATE_COLORS[s.managerScoringStatus]
  const pct = s.managerScoringStatus === 'complete' ? 100 : (s.pillarsScored / 5) * 100
  const href =
    s.managerScoringStatus === 'complete'
      ? `/dr/${s.userId}?roundId=${s.roundId}`
      : `/manager/${s.userId}?roundId=${s.roundId}`

  const statusText =
    s.managerScoringStatus === 'complete'
      ? '✓ Fully scored'
      : s.managerScoringStatus === 'in_progress'
      ? `${s.pillarsScored} of 5 pillars`
      : 'Not scored'

  const actionText =
    s.managerScoringStatus === 'in_progress' ? 'Continue →' : 'Start →'

  return (
    <Link href={href} className="block hover:opacity-90 transition-opacity">
      <div
        className={`rounded-lg border bg-slate-900/60 p-3 flex flex-col gap-2 ${border}`}
      >
        <p className="text-sm font-medium text-white truncate">{s.name}</p>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
          <div
            className={`h-full rounded-full transition-all ${bar}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className={`text-xs ${text}`}>
          {statusText}
          {s.managerScoringStatus !== 'complete' && (
            <span className="ml-1.5 opacity-70">{actionText}</span>
          )}
        </p>
      </div>
    </Link>
  )
}

export function ManagerStrip({ summaries }: Props) {
  const scoreable = summaries.filter(s => s.roundId !== null)
  if (scoreable.length === 0) return null

  const assessedCount = scoreable.filter(s => s.managerScoringStatus === 'complete').length

  return (
    <section id="manager-strip" className="mb-6 rounded-xl border border-amber-800/35 bg-amber-950/10 p-4">
      <div className="mb-3 flex items-center justify-between gap-4">
        <p className="text-xs font-bold uppercase tracking-widest text-amber-400/80">
          Team scoring
        </p>
        <p className="text-xs text-slate-500">
          {assessedCount} of {scoreable.length} assessed
        </p>
      </div>
      <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}>
        {scoreable.map(s => (
          <DrCard key={s.userId} s={s} />
        ))}
      </div>
    </section>
  )
}
