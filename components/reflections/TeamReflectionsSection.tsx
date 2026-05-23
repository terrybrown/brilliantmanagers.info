import Link from 'next/link'
import type { TeamMemberSummary, TeamRoundSummary } from '@/lib/db/direct-reports'

type EnrichedMember = TeamMemberSummary & { name: string }

const STATUS_PILL: Record<string, { label: string; className: string }> = {
  scheduled: { label: 'Scheduled', className: 'bg-slate-700 text-slate-300' },
  in_progress: { label: 'In progress', className: 'bg-green-900/50 text-green-400' },
  complete: { label: 'Complete', className: 'bg-slate-800 text-slate-400' },
}

function ManagerScoreCell({
  round,
  drId,
}: {
  round: TeamRoundSummary
  drId: string
}) {
  const { managerScoringStatus, managerScore, pillarsScored, roundId } = round

  if (managerScoringStatus === 'complete' && managerScore !== null) {
    return (
      <span className="text-xs text-purple-400">
        <span>{managerScore}</span>
        {' ✓'}
      </span>
    )
  }
  if (managerScoringStatus === 'complete') {
    // Scored but no computable average (e.g. all scores filtered as invalid)
    return <span className="text-xs text-neutral-500">—</span>
  }
  if (managerScoringStatus === 'in_progress') {
    return (
      <Link
        href={`/manager/${drId}?roundId=${roundId}`}
        className="text-xs text-blue-400 hover:text-blue-300"
      >
        {pillarsScored}/5 · Continue →
      </Link>
    )
  }
  return (
    <Link
      href={`/manager/${drId}?roundId=${roundId}`}
      className="text-xs font-medium text-amber-400 hover:text-amber-300"
    >
      Score →
    </Link>
  )
}

function DrCard({ member }: { member: EnrichedMember }) {
  const { directReportId, name, rounds, pendingScoringCount } = member

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-neutral-800">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-semibold text-white flex-shrink-0">
            {name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-medium text-white">{name}</p>
            <p className="text-xs text-neutral-500">{rounds.length} round{rounds.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        {pendingScoringCount > 0 ? (
          <span className="rounded-full bg-amber-900/50 px-2 py-0.5 text-xs font-medium text-amber-400">
            {pendingScoringCount} needs scoring
          </span>
        ) : (
          <span className="rounded-full bg-green-900/30 px-2 py-0.5 text-xs text-green-500">
            ✓ All scored
          </span>
        )}
      </div>

      {rounds.length === 0 ? (
        <p className="px-4 py-3 text-xs text-neutral-500">No rounds started yet.</p>
      ) : (
        <div className="divide-y divide-neutral-800/50">
          {rounds.map(round => {
            const pill = STATUS_PILL[round.roundStatus] ?? STATUS_PILL.complete
            return (
              <div
                key={round.roundId}
                className="grid items-center gap-3 px-4 py-2.5 text-xs"
                style={{ gridTemplateColumns: '1fr auto auto auto' }}
              >
                <span className="text-neutral-300 truncate">{round.roundLabel}</span>
                <span className={`rounded px-1.5 py-0.5 font-medium ${pill.className}`}>{pill.label}</span>
                <span className="text-neutral-400 w-8 text-right">
                  {round.roundStatus === 'complete' && round.selfScore !== null
                    ? round.selfScore
                    : '—'}
                </span>
                <ManagerScoreCell round={round} drId={directReportId} />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function TeamReflectionsSection({ summaries }: { summaries: EnrichedMember[] }) {
  if (summaries.length === 0) return null

  return (
    <section>
      <div className="mb-4 flex items-center gap-3">
        <div className="h-px flex-1 bg-neutral-800" />
        <p className="text-xs font-bold uppercase tracking-widest text-purple-400/70">
          Your team&apos;s reflections
        </p>
        <div className="h-px flex-1 bg-neutral-800" />
      </div>
      <div className="flex flex-col gap-4">
        {summaries.map(member => (
          <DrCard key={member.directReportId} member={member} />
        ))}
      </div>
    </section>
  )
}
