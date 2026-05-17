'use client'

interface SparklinePoint {
  date: string
  score: number
}

interface ScoreSparklineProps {
  data: SparklinePoint[]
}

export function ScoreSparkline({ data }: ScoreSparklineProps) {
  if (data.length < 2) return null

  const W = 140
  const H = 36
  const MIN_SCORE = 1
  const MAX_SCORE = 5

  const points = data.map((d, i) => ({
    x: (i / (data.length - 1)) * W,
    y: H - ((d.score - MIN_SCORE) / (MAX_SCORE - MIN_SCORE)) * H,
    date: d.date,
  }))

  const polylinePoints = points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')

  return (
    <div className="rounded-xl bg-slate-800 px-4 py-3">
      <p
        className="mb-2 text-xs text-slate-500"
        style={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}
      >
        Score history
      </p>
      <svg width={W} height={H + 14} viewBox={`0 0 ${W} ${H + 14}`} overflow="visible">
        <polyline
          points={polylinePoints}
          fill="none"
          stroke="#f59e0b"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={2.5} fill="#f59e0b" />
        ))}
        <text x={0} y={H + 12} fontSize={8} fill="#475569">
          {points[0].date}
        </text>
        <text x={W} y={H + 12} fontSize={8} fill="#475569" textAnchor="end">
          {points[points.length - 1].date}
        </text>
      </svg>
    </div>
  )
}
