import Link from 'next/link'

interface CheckInNudgeCardProps {
  overdueCount: number
}

export function CheckInNudgeCard({ overdueCount }: CheckInNudgeCardProps) {
  if (overdueCount === 0) return null

  return (
    <div
      className="rounded-xl px-5 py-4"
      style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)' }}
    >
      <p className="mb-1 text-sm font-semibold text-amber-400">
        {overdueCount} check-in{overdueCount > 1 ? 's' : ''} overdue
      </p>
      <p className="mb-2 text-xs text-slate-400">
        Log your progress to keep your goals on track.
      </p>
      <Link
        href="/growth"
        className="text-xs font-semibold text-amber-400 hover:text-amber-300"
      >
        Go to Growth →
      </Link>
    </div>
  )
}
