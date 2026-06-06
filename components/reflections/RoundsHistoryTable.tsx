import Link from 'next/link'
import type { Pillar } from '@/lib/skills'

export interface RoundRow {
  id: string
  title: string
  dateRange: string
  overallScore: number
  managerOverall: number | null
  pillarScores: Partial<Record<Pillar, number>>
  trend: number | null
}

interface RoundsHistoryTableProps {
  rows: RoundRow[]
}

const PILLAR_COLS: { key: Pillar; label: string }[] = [
  { key: 'self', label: 'Self' },
  { key: 'team', label: 'Team' },
  { key: 'strategy', label: 'Strategy' },
  { key: 'communications', label: 'Comms' },
  { key: 'domain-expertise', label: 'Domain' },
]

export function RoundsHistoryTable({ rows }: RoundsHistoryTableProps) {
  return (
    <div
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-card)',
        overflowX: 'auto',
      }}
    >
      <table aria-label="Rounds history" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr>
            {['Round', 'Overall', 'Mgr', ...PILLAR_COLS.map(c => c.label), 'Trend', 'View'].map(
              (header, i) => (
                <th
                  key={i}
                  scope="col"
                  style={{
                    padding: '10px 14px',
                    textAlign: 'left',
                    color: 'var(--color-text-faint)',
                    fontWeight: 600,
                    borderBottom: '1px solid var(--color-border)',
                    whiteSpace: 'nowrap',
                    background: 'var(--color-bg-base)',
                  }}
                >
                  {header}
                </th>
              )
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={row.id}
              style={{
                borderBottom: '1px solid var(--color-border)',
                background: index === 0 ? 'var(--color-accent-wash)' : 'transparent',
              }}
            >
              <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                <p style={{ fontWeight: 650, fontSize: 13, color: 'var(--color-text-primary)', margin: 0 }}>{row.title}</p>
                <p style={{ color: 'var(--color-text-faint)', fontSize: 11, margin: 0 }}>{row.dateRange}</p>
              </td>
              <td
                style={{
                  padding: '10px 14px',
                  color: 'var(--color-text-primary)',
                  fontFamily: 'var(--font-display)',
                  fontSize: 16,
                  fontWeight: 750,
                }}
              >
                {row.overallScore.toFixed(1)}
              </td>
              <td style={{ padding: '10px 14px', color: 'var(--color-manager)', fontWeight: 600 }}>
                {row.managerOverall !== null ? row.managerOverall.toFixed(1) : '—'}
              </td>
              {PILLAR_COLS.map(col => {
                const score = row.pillarScores[col.key]
                const scoreColorValue =
                  score == null
                    ? 'var(--color-text-muted)'
                    : score <= 2.4
                      ? 'var(--color-alert-fg)'
                      : score >= 4
                        ? 'var(--color-positive)'
                        : 'var(--color-text-muted)'
                return (
                  <td key={col.key} style={{ padding: '10px 14px', color: scoreColorValue }}>
                    {score != null ? score.toFixed(1) : '—'}
                  </td>
                )
              })}
              <td style={{ padding: '10px 14px' }}>
                {row.trend === null ? (
                  <span style={{ color: 'var(--color-text-faint)' }}>—</span>
                ) : row.trend > 0 ? (
                  <span style={{ fontWeight: 700, color: 'var(--color-positive)' }}>+{row.trend.toFixed(1)}</span>
                ) : row.trend < 0 ? (
                  <span style={{ fontWeight: 700, color: 'var(--color-negative)' }}>{row.trend.toFixed(1)}</span>
                ) : (
                  <span style={{ fontWeight: 700, color: 'var(--color-text-muted)' }}>{row.trend.toFixed(1)}</span>
                )}
              </td>
              <td style={{ padding: '10px 14px' }}>
                <Link
                  href={`/reflections/${row.id}`}
                  style={{
                    color: 'var(--color-accent)',
                    fontWeight: 600,
                    textDecoration: 'none',
                    fontSize: 11,
                  }}
                >
                  View →
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
