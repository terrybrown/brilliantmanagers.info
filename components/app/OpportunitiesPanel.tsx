import Link from 'next/link'
import { LEVEL_COLORS, PILLAR_LABELS, type Level, type Pillar } from '@/lib/skills'

interface Opportunity {
  key: string
  label: string
  pillar: Pillar
  level: Level
  score: number
}

interface OpportunitiesPanelProps {
  opportunities: Opportunity[]
}

export function OpportunitiesPanel({ opportunities }: OpportunitiesPanelProps) {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <h2 className="text-sm font-semibold text-white">Top Opportunities</h2>
        <p className="text-xs text-slate-500">Lowest-scoring, no active goal</p>
      </div>

      {opportunities.length === 0 ? (
        <p className="text-sm text-slate-500">All low-scoring skills have active goals.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {opportunities.map(opp => (
            <div
              key={opp.key}
              className="flex items-center gap-3 rounded-xl bg-slate-800 px-4 py-3"
            >
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium text-white">{opp.label}</p>
                <p className="text-xs text-slate-500">
                  {PILLAR_LABELS[opp.pillar]} · {opp.level}
                </p>
              </div>
              <span
                className="shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold"
                style={{
                  color: LEVEL_COLORS[opp.level],
                  background: `${LEVEL_COLORS[opp.level]}20`,
                }}
              >
                {opp.score}
              </span>
              <Link
                href={`/growth/goal/new?skill=${opp.key}`}
                className="shrink-0 rounded-lg bg-indigo-600 px-3 py-1 text-xs font-semibold text-white hover:bg-indigo-500"
              >
                Set goal →
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
