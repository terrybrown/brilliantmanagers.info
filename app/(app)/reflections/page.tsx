// app/(app)/reflections/page.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAllCompleteRoundsWithScores, getInProgressRound } from '@/lib/db/rounds'
import { getScoresForRound } from '@/lib/db/scores'
import { getManagerScoresForAllRounds } from '@/lib/db/manager-scores'
import { getConnectionsForUser } from '@/lib/db/connections'
import { getTeamReflectionSummaries, type TeamMemberSummary } from '@/lib/db/direct-reports'
import { getProfile } from '@/lib/db/profiles'
import { nextRoundTitle, roundLabel, computeTrendData, computeStats, pillarAvgFromScores } from '@/lib/reflections'
import { ReflectionsHeader } from '@/components/reflections/ReflectionsHeader'
import { ReflectionsTrendChart } from '@/components/reflections/ReflectionsTrendChart'
import { RoundsHistoryTable } from '@/components/reflections/RoundsHistoryTable'
import type { RoundRow } from '@/components/reflections/RoundsHistoryTable'
import { TeamReflectionsSection } from '@/components/reflections/TeamReflectionsSection'
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

  const connections = await getConnectionsForUser(user.id)
  const drConnections = connections.asManager.filter(c => c.status === 'active')
  const drIds = drConnections.map(c => c.direct_report_id)

  const [teamSummaries, drProfiles] = drIds.length > 0
    ? await Promise.all([
        getTeamReflectionSummaries(drIds, user.id),
        Promise.all(drIds.map(id => getProfile(id))),
      ])
    : [[] as TeamMemberSummary[], []]

  const profileByDrId = Object.fromEntries(
    (drProfiles as (Awaited<ReturnType<typeof getProfile>>)[])
      .filter((p): p is NonNullable<typeof p> => p !== null)
      .map(p => [p.id, p])
  )

  const enrichedTeamSummaries = teamSummaries.map(s => ({
    ...s,
    name: profileByDrId[s.directReportId]?.display_name ?? 'Direct report',
  }))

  const hasRounds = completeRoundsWithScores.length > 0

  return (
    <div style={{ padding: '24px 28px 40px', maxWidth: 1180, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 22 }}>
      {/* Header + active round card */}
      <ReflectionsHeader
        inProgressRound={inProgressRound}
        scoredPillarCount={scoredPillarCount}
        nextRoundTitle={currentNextRoundTitle}
      />

      {/* Stats bar */}
      {hasRounds && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { label: 'Rounds completed', value: String(stats.totalRounds), color: 'var(--color-text-primary)' },
            {
              label: 'Overall improvement',
              value: `${stats.improvement > 0 ? '+' : ''}${stats.improvement.toFixed(1)}`,
              color: stats.improvement > 0 ? 'var(--color-positive)' : stats.improvement < 0 ? 'var(--color-negative)' : 'var(--color-text-muted)',
            },
            { label: 'Best pillar', value: stats.bestPillar ? PILLAR_LABELS[stats.bestPillar] : '—', color: 'var(--color-text-primary)' },
            {
              label: 'Manager avg',
              value: stats.managerAvg !== null ? stats.managerAvg.toFixed(1) : '—',
              color: stats.managerAvg !== null ? 'var(--color-manager)' : 'var(--color-text-faint)',
            },
          ].map(card => (
            <div
              key={card.label}
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 10,
                boxShadow: 'var(--shadow-card)',
                padding: '14px 16px',
              }}
            >
              <p
                style={{
                  fontSize: 26,
                  fontWeight: 750,
                  fontFamily: 'var(--font-display)',
                  letterSpacing: '-0.02em',
                  lineHeight: 1,
                  color: card.color,
                  marginBottom: 0,
                }}
              >
                {card.value}
              </p>
              <p style={{ fontSize: 11.5, color: 'var(--color-text-faint)', marginTop: 6, marginBottom: 0 }}>{card.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Trend chart */}
      {hasRounds && <ReflectionsTrendChart data={trendData} />}

      {/* History table */}
      {hasRounds && <RoundsHistoryTable rows={rows} />}

      {/* Team reflections (manager view) */}
      <TeamReflectionsSection summaries={enrichedTeamSummaries} />
    </div>
  )
}
