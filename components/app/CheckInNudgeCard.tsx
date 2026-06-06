import Link from 'next/link'

interface CheckInNudgeCardProps {
  overdueCount: number
}

export function CheckInNudgeCard({ overdueCount }: CheckInNudgeCardProps) {
  if (overdueCount === 0) return null

  return (
    <div
      style={{
        background: 'var(--color-alert-bg)',
        border: '1px solid var(--color-alert-border)',
        borderRadius: 10,
        padding: '16px 20px',
      }}
    >
      <p style={{ marginBottom: 4, fontSize: 14, fontWeight: 600, color: 'var(--color-alert-fg)' }}>
        {overdueCount} check-in{overdueCount > 1 ? 's' : ''} overdue
      </p>
      <p style={{ marginBottom: 8, fontSize: 12, color: 'var(--color-text-muted)' }}>
        Log your progress to keep your goals on track.
      </p>
      <Link
        href="/growth"
        style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-alert-fg)', textDecoration: 'none' }}
      >
        Go to Growth →
      </Link>
    </div>
  )
}
