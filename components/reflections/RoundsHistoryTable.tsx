import Link from 'next/link'
import type { Pillar } from '@/lib/skills'

export interface RoundRow {
  id: string
  title: string
  dateRange: string
  overallScore: number
  managerOverall: number | null
  pillarScores: Record<Pillar, number>
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
    <div className="rounded-xl bg-slate-800 overflow-x-auto">
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr>
            {['Round', 'Your score', 'Manager score', ...PILLAR_COLS.map(c => c.label), 'Trend', 'View'].map(
              header => (
                <th
                  key={header}
                  style={{
                    padding: '10px 14px',
                    textAlign: 'left',
                    color: '#64748b',
                    fontWeight: 600,
                    borderBottom: '1px solid #1e293b',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {header}
                </th>
              )
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr
              key={row.id}
              style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
            >
              <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                <p style={{ fontWeight: 600, color: '#fff' }}>{row.title}</p>
                <p style={{ color: '#475569', fontSize: 11 }}>{row.dateRange}</p>
              </td>
              <td style={{ padding: '10px 14px', color: '#f59e0b', fontWeight: 700 }}>
                {row.overallScore.toFixed(1)}
              </td>
              <td style={{ padding: '10px 14px', color: '#a78bfa', fontWeight: 600 }}>
                {row.managerOverall !== null ? row.managerOverall.toFixed(1) : '—'}
              </td>
              {PILLAR_COLS.map(col => (
                <td key={col.key} style={{ padding: '10px 14px', color: '#94a3b8' }}>
                  {row.pillarScores[col.key].toFixed(1)}
                </td>
              ))}
              <td style={{ padding: '10px 14px' }}>
                {row.trend !== null ? (
                  <span
                    style={{
                      fontWeight: 700,
                      color: row.trend >= 0 ? '#4ade80' : '#f87171',
                    }}
                  >
                    {row.trend >= 0 ? '+' : ''}
                    {row.trend.toFixed(1)}
                  </span>
                ) : (
                  <span style={{ color: '#475569' }}>—</span>
                )}
              </td>
              <td style={{ padding: '10px 14px' }}>
                <Link
                  href={`/reflections/${row.id}`}
                  style={{
                    color: '#64748b',
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
