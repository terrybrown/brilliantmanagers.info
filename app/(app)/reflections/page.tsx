// app/(app)/reflections/page.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAllCompleteRoundsWithScores, getInProgressRound } from '@/lib/db/rounds'
import { getScoresForRound } from '@/lib/db/scores'
import { getManagerScoresForAllRounds } from '@/lib/db/manager-scores'
import { nextRoundTitle, roundLabel, computeTrendData, computeStats, pillarAvgFromScores } from '@/lib/reflections'
import { ReflectionsHeader } from '@/components/reflections/ReflectionsHeader'
import { ReflectionsTrendChart } from '@/components/reflections/ReflectionsTrendChart'
import { RoundsHistoryTable } from '@/components/reflections/RoundsHistoryTable'
import type { RoundRow } from '@/components/reflections/RoundsHistoryTable'
import { PILLARS, PILLAR_LABELS, LEVEL_VALUES, type Pillar, type Level } from '@/lib/skills'

export default async function ReflectionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [completeRoundsWithScores, inProgressRound] = await Promise.all([
    getAllCompleteRoundsWithScores(user.id),
    getInProgressRound(user.id),
  ])

  const inProgressScores = inProgressRound ? await getScoresForRound(inProgressRound.id) : []
  const scoredPillarCount = new Set(inProgressScores.map(s => s.pillar)).size

  const roundIds = completeRoundsWithScores.map(({ round }) => round.id)
  const managerScoresByRound = await getManagerScoresForAllRounds(roundIds)

  const trendData = computeTrendData(completeRoundsWithScores, managerScoresByRound)
  const stats = computeStats(completeRoundsWithScores, managerScoresByRound)
  const currentNextRoundTitle = nextRoundTitle()

  const rows: RoundRow[] = completeRoundsWithScores
    .slice()
    .reverse()
    .map(({ round, scores }, index, arr) => {
      const prevScores = index < arr.length - 1 ? arr[index + 1].scores : null

      const overallScore =
        scores.length > 0
          ? scores.reduce((sum, s) => sum + LEVEL_VALUES[s.level as Level], 0) / scores.length
          : 0

      const prevOverall = prevScores
        ? prevScores.length > 0
          ? prevScores.reduce((sum, s) => sum + LEVEL_VALUES[s.level as Level], 0) / prevScores.length
          : 0
        : null

      const mgrScores = managerScoresByRound[round.id] ?? []
      const managerOverall =
        mgrScores.length > 0
          ? mgrScores.reduce((sum, ms) => sum + LEVEL_VALUES[ms.level as Level], 0) / mgrScores.length
          : null

      const pillarScores = Object.fromEntries(
        PILLARS.map(pillar => {
          const avg = pillarAvgFromScores(scores, pillar)
          return [pillar, avg > 0 ? Number(avg.toFixed(1)) : undefined]
        })
      ) as Partial<Record<Pillar, number>>

      const start = new Date(round.created_at).toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
      })
      const end = round.completed_at
        ? new Date(round.completed_at).toLocaleDateString('en-US', {
            month: 'short',
            year: 'numeric',
          })
        : null

      return {
        id: round.id,
        title: roundLabel(round),
        dateRange: end ? `${start} – ${end}` : start,
        overallScore: Number(overallScore.toFixed(1)),
        managerOverall: managerOverall !== null ? Number(managerOverall.toFixed(1)) : null,
        pillarScores,
        trend: prevOverall !== null ? Number((overallScore - prevOverall).toFixed(1)) : null,
      }
    })

  const hasRounds = completeRoundsWithScores.length > 0

  return (
    <div style={{ padding: '32px 36px', display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header + active round card */}
      <ReflectionsHeader
        inProgressRound={inProgressRound}
        scoredPillarCount={scoredPillarCount}
        nextRoundTitle={currentNextRoundTitle}
      />

      {/* Stats bar */}
      {hasRounds && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {[
            { label: 'Rounds completed', value: String(stats.totalRounds) },
            {
              label: 'Overall improvement',
              value: `${stats.improvement >= 0 ? '+' : ''}${stats.improvement.toFixed(1)}`,
              color: stats.improvement >= 0 ? '#4ade80' : '#f87171',
            },
            { label: 'Best pillar', value: stats.bestPillar ? PILLAR_LABELS[stats.bestPillar] : '—' },
            {
              label: 'Manager avg',
              value: stats.managerAvg !== null ? stats.managerAvg.toFixed(1) : '—',
              color: '#a78bfa',
            },
          ].map(card => (
            <div
              key={card.label}
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 10,
                padding: '14px 16px',
              }}
            >
              <p
                style={{
                  fontSize: 20,
                  fontWeight: 800,
                  color: card.color ?? '#f59e0b',
                  marginBottom: 4,
                  letterSpacing: '-0.02em',
                }}
              >
                {card.value}
              </p>
              <p style={{ fontSize: 11, color: '#475569' }}>{card.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Trend chart */}
      {hasRounds && <ReflectionsTrendChart data={trendData} />}

      {/* History table */}
      {hasRounds && <RoundsHistoryTable rows={rows} />}
    </div>
  )
}
