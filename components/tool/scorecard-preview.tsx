import { SCORING_LEVEL_COLORS } from '@/config/scoring'
import type { ScoringLevel } from '@/config/scoring'

interface SampleRow {
  label: string
  level: ScoringLevel | null
}

const SAMPLE_ROWS: SampleRow[] = [
  { label: 'Self-awareness', level: 'Proficient' },
  { label: 'Emotional regulation under pressure', level: 'Practising' },
  { label: 'Coaching instinct', level: 'Developing' },
  { label: 'Receiving feedback openly', level: 'Leading' },
  { label: 'Delegation and trust', level: null },
]

export function ScorecardPreview() {
  return (
    <div
      className="rounded-xl p-5"
      style={{ background: 'rgba(254,252,247,0.05)', border: '1px solid rgba(254,252,247,0.10)' }}
    >
      <p
        className="mb-4 text-xs font-semibold uppercase tracking-widest"
        style={{ color: 'rgba(254,252,247,0.35)' }}
      >
        Sample · Self pillar
      </p>
      <div className="space-y-2">
        {SAMPLE_ROWS.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-3">
            <span className="text-sm" style={{ color: 'rgba(254,252,247,0.75)' }}>
              {row.label}
            </span>
            {row.level ? (
              <span
                className={`rounded-md px-2.5 py-0.5 text-xs font-semibold ${SCORING_LEVEL_COLORS[row.level].bg} ${SCORING_LEVEL_COLORS[row.level].text}`}
              >
                {row.level}
              </span>
            ) : (
              <span
                className="rounded-md border px-2.5 py-0.5 text-xs"
                style={{ borderStyle: 'dashed', borderColor: 'rgba(254,252,247,0.15)', color: 'rgba(254,252,247,0.25)' }}
              >
                — not yet rated
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
