// app/(app)/reflections/[id]/page.tsx
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getRoundById } from '@/lib/db/rounds'
import { getScoresForRound } from '@/lib/db/scores'
import { getManagerScoresForDirectReport } from '@/lib/db/manager-scores'
import { roundLabel, computePillarScores, type RadarPillarScore } from '@/lib/reflections'
import { ScorecardRadarChart } from '@/components/app/ScorecardRadarChart'
import { PILLAR_LABELS, LEVELS, type Level } from '@/lib/skills'
import { scoreColor } from '@/lib/utils/score-tokens'
import { ReflectionViewTracker } from '@/components/reflections/ReflectionViewTracker'

export default async function ReflectionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const round = await getRoundById(id, user.id)
  if (!round) return notFound()

  const [scores, managerScores] = await Promise.all([
    getScoresForRound(round.id),
    getManagerScoresForDirectReport(round.id),
  ])

  const pillarScoresForRadar = computePillarScores(scores, managerScores)

  function scoreToLevel(score: number): Level {
    const idx = Math.min(4, Math.max(0, Math.round(score) - 1))
    return LEVELS[idx]
  }

  const title = roundLabel(round)
  const startDate = new Date(round.created_at).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
    day: 'numeric',
  })
  const endDate = round.completed_at
    ? new Date(round.completed_at).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
        day: 'numeric',
      })
    : null

  return (
    <div style={{ padding: '24px 28px 40px', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <ReflectionViewTracker roundId={round.id} status={round.status} />
      {/* Breadcrumb */}
      <Link
        href="/reflections"
        style={{ fontSize: 13, color: 'var(--color-text-muted)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}
      >
        ← Reflections
      </Link>

      {/* Round header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <h1
          style={{
            fontSize: 22,
            fontWeight: 800,
            color: 'var(--color-text-primary)',
            letterSpacing: '-0.02em',
            fontFamily: 'var(--font-display)',
          }}
        >
          {title}
        </h1>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            borderRadius: 6,
            padding: '3px 8px',
            background: round.status === 'complete' ? 'var(--color-positive-bg)' : 'var(--color-accent-wash2)',
            color: round.status === 'complete' ? 'var(--color-positive)' : 'var(--color-accent)',
          }}
        >
          {round.status === 'complete' ? 'Completed' : 'In progress'}
        </span>
      </div>

      <p style={{ fontSize: 12, color: 'var(--color-text-faint)', marginTop: -16 }}>
        {startDate}
        {endDate && ` – ${endDate}`}
      </p>

      {round.notes && (
        <div
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 10,
            padding: '12px 16px',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-faint)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Intention
          </p>
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', lineHeight: 1.6 }}>{round.notes}</p>
        </div>
      )}

      {/* Two-column: radar + pillar table */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_1fr] items-start">
        <div>
          <ScorecardRadarChart
            pillarScores={pillarScoresForRadar}
          />
        </div>

        <div
          style={{
            borderRadius: 'var(--radius-lg)',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            boxShadow: 'var(--shadow-card)',
            overflowX: 'auto',
          }}
        >
          <table aria-label="Pillar scores" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr>
                {['Pillar', 'Your score', 'Manager score', 'Gap', 'Level'].map((h, i) => (
                  <th
                    key={i}
                    scope="col"
                    style={{
                      padding: '10px 14px',
                      textAlign: 'left',
                      color: 'var(--color-text-faint)',
                      fontWeight: 600,
                      borderBottom: '1px solid var(--color-border)',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pillarScoresForRadar.map((row: RadarPillarScore) => (
                  <tr
                    key={row.pillar}
                    style={{ borderBottom: '1px solid var(--color-border)' }}
                  >
                    <td style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                      {PILLAR_LABELS[row.pillar]}
                    </td>
                    <td style={{ padding: '10px 14px', color: 'var(--color-accent)', fontWeight: 700 }}>
                      {row.selfScored ? row.selfScore.toFixed(1) : '—'}
                    </td>
                    <td style={{ padding: '10px 14px', color: 'var(--color-manager)' }}>
                      {row.managerScore !== undefined ? row.managerScore.toFixed(1) : '—'}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      {row.selfScored && row.managerScore !== undefined ? (
                        (() => {
                          const gap = Number((row.managerScore - row.selfScore).toFixed(1))
                          return (
                            <span style={{ fontWeight: 700, color: gap > 0 ? 'var(--color-positive)' : gap < 0 ? 'var(--color-negative)' : 'var(--color-text-muted)' }}>
                              {gap > 0 ? '+' : ''}{gap.toFixed(1)}
                            </span>
                          )
                        })()
                      ) : (
                        <span style={{ color: 'var(--color-text-faint)' }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      {row.selfScored ? (
                        <span style={{ fontWeight: 700, fontSize: 11, color: scoreColor(row.selfScore) }}>
                          {scoreToLevel(row.selfScore)}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--color-text-faint)' }}>—</span>
                      )}
                    </td>
                  </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
