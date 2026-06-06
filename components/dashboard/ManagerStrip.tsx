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

const STATUS_STYLES: Record<ManagerScoringStatus, { borderColor: string; barBg: string; textColor: string }> = {
  not_started: {
    borderColor: 'var(--color-alert-border)',
    barBg: 'var(--color-alert-fg)',
    textColor: 'var(--color-alert-fg)',
  },
  in_progress: {
    borderColor: 'var(--color-accent-border)',
    barBg: 'var(--color-accent)',
    textColor: 'var(--color-accent)',
  },
  complete: {
    borderColor: 'var(--color-positive-border)',
    barBg: 'var(--color-positive)',
    textColor: 'var(--color-positive)',
  },
}

function DrCard({ s }: { s: EnrichedDRSummary }) {
  const { borderColor, barBg, textColor } = STATUS_STYLES[s.managerScoringStatus]
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
    <Link href={href} style={{ display: 'block', textDecoration: 'none' }} className="hover:opacity-90 transition-opacity">
      <div
        style={{
          background: 'var(--color-surface)',
          border: `1px solid ${borderColor}`,
          borderRadius: 8,
          padding: 12,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        <p
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: 'var(--color-text-primary)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {s.name}
        </p>
        <div
          style={{
            height: 6,
            width: '100%',
            overflow: 'hidden',
            borderRadius: 99,
            background: 'var(--color-track)',
          }}
        >
          <div
            style={{
              height: '100%',
              borderRadius: 99,
              background: barBg,
              width: `${pct}%`,
              transition: 'width 0.3s',
            }}
          />
        </div>
        <p style={{ fontSize: 12, color: textColor }}>
          {statusText}
          {s.managerScoringStatus !== 'complete' && (
            <span style={{ marginLeft: 6, opacity: 0.7 }}>{actionText}</span>
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
    <section
      id="manager-strip"
      style={{
        marginBottom: 24,
        borderRadius: 10,
        border: '1px solid var(--color-border)',
        background: 'var(--color-surface)',
        boxShadow: 'var(--shadow-card)',
        padding: 16,
      }}
    >
      <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <p
          style={{
            fontSize: 11,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: 'var(--color-accent)',
          }}
        >
          Team scoring
        </p>
        <p style={{ fontSize: 12, color: 'var(--color-text-faint)' }}>
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
