// app/(app)/reflections/[id]/page.tsx
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getRoundById } from '@/lib/db/rounds'
import { getScoresForRound } from '@/lib/db/scores'
import { getManagerScoresForDirectReport } from '@/lib/db/manager-scores'
import { roundLabel, computePillarScores, type RadarPillarScore } from '@/lib/reflections'
import { ScorecardRadarChart } from '@/components/app/ScorecardRadarChart'
import { PILLAR_LABELS, LEVELS, LEVEL_COLORS, type Level } from '@/lib/skills'

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
  const hasManagerScores = pillarScoresForRadar.some(p => p.managerScore !== undefined)

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
    <div style={{ padding: '32px 36px', display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Breadcrumb */}
      <Link
        href="/reflections"
        style={{ fontSize: 13, color: '#64748b', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}
      >
        ← Reflections
      </Link>

      {/* Round header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <h1
          style={{
            fontSize: 22,
            fontWeight: 800,
            color: '#fff',
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
            background: round.status === 'complete' ? 'rgba(74,222,128,0.1)' : 'rgba(245,158,11,0.1)',
            color: round.status === 'complete' ? '#4ade80' : '#f59e0b',
          }}
        >
          {round.status === 'complete' ? 'Completed' : 'In progress'}
        </span>
      </div>

      <p style={{ fontSize: 12, color: '#475569', marginTop: -16 }}>
        {startDate}
        {endDate && ` – ${endDate}`}
      </p>

      {round.notes && (
        <div
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 10,
            padding: '12px 16px',
          }}
        >
          <p style={{ fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Intention
          </p>
          <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.6 }}>{round.notes}</p>
        </div>
      )}

      {/* Two-column: radar + pillar table */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '220px 1fr',
          gap: 24,
          alignItems: 'start',
        }}
      >
        <div>
          <ScorecardRadarChart
            pillarScores={pillarScoresForRadar}
            showManager={hasManagerScores}
          />
        </div>

        <div className="rounded-xl bg-slate-800 overflow-hidden">
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
                      color: '#64748b',
                      fontWeight: 600,
                      borderBottom: '1px solid #1e293b',
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
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                  >
                    <td style={{ padding: '10px 14px', fontWeight: 600, color: '#fff' }}>
                      {PILLAR_LABELS[row.pillar]}
                    </td>
                    <td style={{ padding: '10px 14px', color: '#f59e0b', fontWeight: 700 }}>
                      {row.selfScored ? row.selfScore.toFixed(1) : '—'}
                    </td>
                    <td style={{ padding: '10px 14px', color: '#a78bfa' }}>
                      {row.managerScore !== undefined ? row.managerScore.toFixed(1) : '—'}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      {row.selfScored && row.managerScore !== undefined ? (
                        (() => {
                          const gap = Number((row.managerScore - row.selfScore).toFixed(1))
                          return (
                            <span style={{ fontWeight: 700, color: gap > 0 ? '#4ade80' : gap < 0 ? '#f87171' : '#94a3b8' }}>
                              {gap > 0 ? '+' : ''}{gap.toFixed(1)}
                            </span>
                          )
                        })()
                      ) : (
                        <span style={{ color: '#475569' }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      {row.selfScored ? (
                        <span style={{ fontWeight: 700, fontSize: 11, color: LEVEL_COLORS[scoreToLevel(row.selfScore)] }}>
                          {scoreToLevel(row.selfScore)}
                        </span>
                      ) : (
                        <span style={{ color: '#475569' }}>—</span>
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
