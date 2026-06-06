import Link from 'next/link'
import { CheckCircle } from 'lucide-react'
import type { TeamMemberSummary, TeamRoundSummary } from '@/lib/db/direct-reports'
import type React from 'react'

type EnrichedMember = TeamMemberSummary & { name: string }

const STATUS_PILL: Record<string, { label: string; style: React.CSSProperties }> = {
  scheduled: { label: 'Scheduled', style: { background: 'var(--color-chip-bg)', color: 'var(--color-text-muted)' } },
  in_progress: { label: 'In progress', style: { background: 'var(--color-positive-bg)', color: 'var(--color-positive)' } },
  complete: { label: 'Complete', style: { background: 'var(--color-chip-bg)', color: 'var(--color-text-faint)' } },
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
      <span style={{ fontSize: 12, color: 'var(--color-manager)', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
        <span>{managerScore}</span>
        <CheckCircle size={11} />
      </span>
    )
  }
  if (managerScoringStatus === 'complete') {
    return <span style={{ fontSize: 12, color: 'var(--color-text-faint)' }}>—</span>
  }
  if (managerScoringStatus === 'in_progress') {
    return (
      <Link
        href={`/manager/${drId}?roundId=${roundId}`}
        style={{ fontSize: 12, color: 'var(--color-accent)', textDecoration: 'none' }}
      >
        {pillarsScored}/5 · Continue →
      </Link>
    )
  }
  return (
    <Link
      href={`/manager/${drId}?roundId=${roundId}`}
      style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-accent)', textDecoration: 'none' }}
    >
      Score →
    </Link>
  )
}

function DrCard({ member }: { member: EnrichedMember }) {
  const { directReportId, name, rounds, pendingScoringCount } = member

  return (
    <div
      style={{
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-border)',
        background: 'var(--color-surface)',
        boxShadow: 'var(--shadow-card)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          padding: '12px 16px',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              height: 32,
              width: 32,
              borderRadius: '50%',
              background: 'var(--color-manager)',
              color: 'var(--color-accent-fg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              fontWeight: 600,
              flexShrink: 0,
            }}
          >
            {name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)', margin: 0 }}>{name}</p>
            <p style={{ fontSize: 12, color: 'var(--color-text-faint)', margin: 0 }}>
              {rounds.length} round{rounds.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        {pendingScoringCount > 0 ? (
          <span
            style={{
              borderRadius: 9999,
              background: 'var(--color-alert-bg)',
              border: '1px solid var(--color-alert-border)',
              padding: '2px 8px',
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--color-alert-fg)',
              flexShrink: 0,
            }}
          >
            {pendingScoringCount} needs scoring
          </span>
        ) : (
          <span
            style={{
              borderRadius: 9999,
              background: 'var(--color-positive-bg)',
              padding: '2px 8px',
              fontSize: 11,
              color: 'var(--color-positive)',
              flexShrink: 0,
            }}
          >
            <CheckCircle size={11} style={{ flexShrink: 0 }} /> All scored
          </span>
        )}
      </div>

      {rounds.length === 0 ? (
        <p style={{ padding: '12px 16px', fontSize: 12, color: 'var(--color-text-faint)', margin: 0 }}>
          No rounds started yet.
        </p>
      ) : (
        <div>
          {rounds.map((round, idx) => {
            const pill = STATUS_PILL[round.roundStatus] ?? STATUS_PILL.complete
            return (
              <div
                key={round.roundId}
                style={{
                  display: 'grid',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 16px',
                  fontSize: 12,
                  gridTemplateColumns: '1fr auto auto auto',
                  borderTop: idx > 0 ? '1px solid var(--color-border)' : undefined,
                }}
              >
                <span style={{ color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {round.roundLabel}
                </span>
                <span
                  style={{
                    ...pill.style,
                    borderRadius: 4,
                    padding: '2px 6px',
                    fontSize: 10,
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {pill.label}
                </span>
                <span style={{ color: 'var(--color-text-muted)', width: 32, textAlign: 'right' }}>
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
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ height: 1, flex: 1, background: 'var(--color-border)' }} />
        <p
          style={{
            fontSize: 11,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--color-text-muted)',
            margin: 0,
          }}
        >
          Your team&apos;s reflections
        </p>
        <div style={{ height: 1, flex: 1, background: 'var(--color-border)' }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {summaries.map(member => (
          <DrCard key={member.directReportId} member={member} />
        ))}
      </div>
    </section>
  )
}
