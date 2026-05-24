// app/(app)/dashboard/page.tsx
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Lightbulb, Search, TrendingUp, MessageSquare, type LucideIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { DashboardTour } from '@/components/dashboard/DashboardTour'
import { DashboardManagerTour } from '@/components/dashboard/DashboardManagerTour'
import { ManagerStrip, type EnrichedDRSummary } from '@/components/dashboard/ManagerStrip'
import { getAllCompleteRoundsWithScores, getInProgressRound } from '@/lib/db/rounds'
import { getConnectionsForUser } from '@/lib/db/connections'
import { getDirectReportRoundSummaries } from '@/lib/db/direct-reports'
import { getProfile } from '@/lib/db/profiles'
import { getScoresForRound } from '@/lib/db/scores'
import { getManagerScoresForDirectReport, getManagerScoresForAllRounds } from '@/lib/db/manager-scores'
import { getPlansForUser } from '@/lib/db/development-plans'
import { nextRoundTitle as computeNextRoundTitle, computePillarScores } from '@/lib/reflections'
import {
  PILLARS,
  PILLAR_LABELS,
  getSkillsByPillar,
  LEVEL_VALUES,
  type Pillar,
  type Level,
} from '@/lib/skills'
import { DashboardResults } from '@/components/dashboard/DashboardResults'
import type { PillarData } from '@/components/app/PillarAccordion'
import type { HistoryPoint } from '@/components/app/PillarHistoryChart'

const BENEFIT_STRIPS: Array<{ Icon: LucideIcon; title: string; desc: string }> = [
  {
    Icon: Lightbulb,
    title: 'See exactly where you stand',
    desc: 'A radar across all five pillars shows your strengths and gaps at a glance.',
  },
  {
    Icon: Search,
    title: 'Know where to focus first',
    desc: "Your lowest pillar is flagged automatically so you're never guessing what to work on.",
  },
  {
    Icon: TrendingUp,
    title: 'Track growth round to round',
    desc: 'Rescore yourself every few months and watch your progress trend over time.',
  },
  {
    Icon: MessageSquare,
    title: 'A ready-made discussion starter with your manager',
    desc: 'Share your scorecard snapshot — a structured starting point for a real conversation.',
  },
]

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // ── Direct report data (manager view) ───────────────────────────────────────
  const connections = await getConnectionsForUser(user.id)
  const drConnections = connections.asManager.filter(c => c.status === 'active')
  const drIds = drConnections.map(c => c.direct_report_id)

  const [drSummaries, drProfiles] = drIds.length > 0
    ? await Promise.all([
        getDirectReportRoundSummaries(drIds, user.id),
        Promise.all(drIds.map(id => getProfile(id))),
      ])
    : [{} as Record<string, never>, []]

  const profileByDrId = Object.fromEntries(
    (drProfiles as (Awaited<ReturnType<typeof getProfile>>)[])
      .filter((p): p is NonNullable<typeof p> => p !== null)
      .map(p => [p.id, p])
  )

  const enrichedDRs: EnrichedDRSummary[] = drIds
    .filter(id => drSummaries[id] !== undefined)
    .map(id => ({
      ...drSummaries[id],
      userId: id,
      name: profileByDrId[id]?.display_name ?? 'Direct report',
    }))

  const isManager = enrichedDRs.length > 0
  const actionableDRs = enrichedDRs.filter(
    s => s.completedAt !== null && s.managerScoringStatus !== 'complete'
  )

  const allRoundsWithScores = await getAllCompleteRoundsWithScores(user.id)

  // ── Empty state ──────────────────────────────────────────────────────────────
  if (allRoundsWithScores.length === 0) {
    const hasScoreableDRs = enrichedDRs.some(s => s.roundId !== null)

    if (hasScoreableDRs) {
      return (
        <div style={{ padding: '40px 36px 40px' }}>
          <DashboardManagerTour hasManagerStrip={enrichedDRs.length > 0} />
          <ManagerStrip summaries={enrichedDRs} />
          <div
            style={{
              marginTop: 32,
              padding: '20px 24px',
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 12,
            }}
          >
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginBottom: 12 }}>
              When you&apos;re ready, run your own self-assessment too.
            </p>
            <Link
              id="dashboard-cta-btn"
              href="/scorecard"
              style={{ fontSize: 13, color: '#f59e0b', textDecoration: 'none', fontWeight: 600 }}
            >
              Start your scorecard →
            </Link>
          </div>
        </div>
      )
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {/* CTA area */}
        <div style={{ padding: '40px 36px 0' }}>
          <ManagerStrip summaries={enrichedDRs} />
          {!isManager && <DashboardTour />}
          {isManager && <DashboardManagerTour hasManagerStrip={enrichedDRs.length > 0} />}

          <div style={{ marginBottom: 36 }}>
            <p
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.3)',
                marginBottom: 12,
              }}
            >
              Your manager scorecard
            </p>
            <h1
              style={{
                fontSize: 26,
                fontWeight: 800,
                lineHeight: 1.2,
                letterSpacing: '-0.02em',
                color: '#fff',
                marginBottom: 12,
                fontFamily: 'var(--font-display)',
              }}
            >
              You&apos;re one short reflection away from{' '}
              <em style={{ color: '#f59e0b', fontStyle: 'normal' }}>real clarity.</em>
            </h1>
            <p
              style={{
                fontSize: 14,
                color: 'rgba(255,255,255,0.5)',
                lineHeight: 1.7,
                maxWidth: 480,
                marginBottom: 24,
              }}
            >
              Most managers guess at where they&apos;re strong and where they&apos;re not. Ten
              minutes of honest self-assessment across five pillars gives you a structured picture
              — and something concrete to bring to your next 1:1.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <Link
                id="dashboard-cta-btn"
                href="/scorecard"
                className="hover:opacity-90 active:opacity-80"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  background: '#f59e0b',
                  color: '#1a2a3a',
                  fontWeight: 700,
                  fontSize: 13,
                  padding: '12px 22px',
                  borderRadius: 10,
                  textDecoration: 'none',
                }}
              >
                Start your scorecard →
              </Link>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>
                ~10 minutes · no right answers
              </span>
            </div>
          </div>
        </div>

        {/* Benefit strips */}
        <div style={{ padding: '0 36px 40px' }}>
          <p
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.2)',
              marginBottom: 14,
            }}
          >
            What you&apos;ll unlock
          </p>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 12,
            }}
          >
            {BENEFIT_STRIPS.map(strip => (
              <div
                key={strip.title}
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: 10,
                  padding: 16,
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    background: 'rgba(245,158,11,0.1)',
                    borderRadius: 8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 12,
                  }}
                >
                  <strip.Icon size={16} color="#f59e0b" strokeWidth={1.5} />
                </div>
                <p
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: 'rgba(255,255,255,0.85)',
                    marginBottom: 5,
                    lineHeight: 1.3,
                  }}
                >
                  {strip.title}
                </p>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)', lineHeight: 1.55 }}>
                  {strip.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ── Latest round ─────────────────────────────────────────────────────────────
  const { round, scores } = allRoundsWithScores[allRoundsWithScores.length - 1]

  // ── Parallel data fetch ───────────────────────────────────────────────────────
  const allRoundIds = allRoundsWithScores.map(({ round: r }) => r.id)
  const [managerScores, plans, inProgress, managerHistoryByRound] = await Promise.all([
    getManagerScoresForDirectReport(round.id),
    getPlansForUser(user.id),
    getInProgressRound(user.id),
    getManagerScoresForAllRounds(allRoundIds),
  ])

  const hasManagerScores = managerScores.length > 0

  const overallManagerAvg =
    managerScores.length > 0
      ? managerScores.reduce((sum, s) => sum + LEVEL_VALUES[s.level as Level], 0) / managerScores.length
      : undefined

  const overdueCheckins = plans.filter(p => {
    if (p.status === 'completed' || !p.checkin_frequency_weeks) return false
    const base = p.last_checkin_at ? new Date(p.last_checkin_at) : new Date(p.created_at)
    const nextDue = new Date(base.getTime() + p.checkin_frequency_weeks * 7 * 24 * 60 * 60 * 1000)
    return nextDue < new Date()
  })

  // ── Overall score ─────────────────────────────────────────────────────────────
  const overallAvg =
    scores.length > 0
      ? scores.reduce((sum, s) => sum + LEVEL_VALUES[s.level as Level], 0) / scores.length
      : 0

  const roundDate = new Date(round.completed_at ?? round.created_at).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  })

  // ── Pillar data for radar ─────────────────────────────────────────────────────
  const activePlanKeys = new Set(
    plans.filter(p => p.status === 'planned' || p.status === 'in_progress').map(p => p.skill_key)
  )
  const planGoalByKey = Object.fromEntries(
    plans.filter(p => p.status !== 'completed').map(p => [p.skill_key, p.goal])
  )

  const pillarScoresForRadar = computePillarScores(scores, managerScores)

  const pillarScoreMap = Object.fromEntries(
    pillarScoresForRadar.map(p => [p.pillar, p.selfScore])
  )
  const lowestPillar = PILLARS.reduce((lowest, p) =>
    pillarScoreMap[p] < pillarScoreMap[lowest] ? p : lowest
  )

  // ── Previous round pillar scores (for delta badges) ───────────────────────────
  const prevRoundData =
    allRoundsWithScores.length >= 2
      ? allRoundsWithScores[allRoundsWithScores.length - 2]
      : null

  const prevPillarScoreMap: Record<string, number> | null = prevRoundData
    ? Object.fromEntries(
        PILLARS.map(pillar => {
          const ps = prevRoundData.scores.filter(s => s.pillar === pillar)
          const avg =
            ps.length > 0
              ? ps.reduce((sum, s) => sum + LEVEL_VALUES[s.level as Level], 0) / ps.length
              : 0
          return [pillar, avg]
        })
      )
    : null

  // ── Pillar accordion data ─────────────────────────────────────────────────────
  const pillarsForAccordion: PillarData[] = PILLARS.map(pillar => {
    const pillarSkills = getSkillsByPillar(pillar as Pillar)
    const pillarSelfScores = scores.filter(s => s.pillar === pillar)
    const selfAvg = pillarScoresForRadar.find(p => p.pillar === pillar)?.selfScore ?? 0
    const managerPillarScore = pillarScoresForRadar.find(p => p.pillar === pillar)?.managerScore

    return {
      pillar,
      label: PILLAR_LABELS[pillar as Pillar],
      score: selfAvg,
      isLowest: pillar === lowestPillar,
      prevScore: prevPillarScoreMap?.[pillar],
      managerScore: managerPillarScore,
      skills: pillarSkills.map(skill => {
        const selfScore = pillarSelfScores.find(s => s.skill_key === skill.key)
        const level = (selfScore?.level ?? 'Basic') as Level
        const score = LEVEL_VALUES[level]
        const hasActiveGoal = activePlanKeys.has(skill.key)
        let chipType: 'opportunity' | 'goal' | null = null
        if (hasActiveGoal) chipType = 'goal'
        else if (score <= 2) chipType = 'opportunity'
        const mgrScore = managerScores.find(ms => ms.skill_key === skill.key)
        return {
          key: skill.key,
          name: skill.label,
          description: skill.description,
          level,
          score,
          chipType,
          goalText: hasActiveGoal ? planGoalByKey[skill.key] : undefined,
          managerLevel: mgrScore?.level as Level | undefined,
          managerScore: mgrScore ? LEVEL_VALUES[mgrScore.level as Level] : undefined,
        }
      }),
    }
  })

  // ── History chart data (per-pillar per round) ─────────────────────────────────
  const historyData: HistoryPoint[] = allRoundsWithScores.map(({ round: r, scores: s }) => {
    const date = new Date(r.completed_at ?? r.created_at).toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric',
    })
    const overall =
      s.length > 0
        ? s.reduce((sum, sc) => sum + LEVEL_VALUES[sc.level as Level], 0) / s.length
        : 0
    const pillarEntries = PILLARS.map(pillar => {
      const ps = s.filter(sc => sc.pillar === pillar)
      const avg =
        ps.length > 0
          ? ps.reduce((sum, sc) => sum + LEVEL_VALUES[sc.level as Level], 0) / ps.length
          : 0
      return [pillar, Number(avg.toFixed(2))]
    })
    const mgrRoundScores = managerHistoryByRound[r.id] ?? []
    const mgrOverall =
      mgrRoundScores.length > 0
        ? mgrRoundScores.reduce((sum, ms) => sum + LEVEL_VALUES[ms.level as Level], 0) / mgrRoundScores.length
        : undefined
    const mgrPillarEntries = PILLARS.map(pillar => {
      const skillKeys = getSkillsByPillar(pillar as Pillar).map(sk => sk.key)
      const ps = mgrRoundScores.filter(ms => skillKeys.includes(ms.skill_key))
      const avg =
        ps.length > 0
          ? ps.reduce((sum, ms) => sum + LEVEL_VALUES[ms.level as Level], 0) / ps.length
          : undefined
      return [`mgr_${pillar}`, avg !== undefined ? Number(avg.toFixed(2)) : undefined]
    })
    return {
      date,
      overall: Number(overall.toFixed(2)),
      ...Object.fromEntries(pillarEntries),
      ...(mgrOverall !== undefined ? { mgr_overall: Number(mgrOverall.toFixed(2)) } : {}),
      ...Object.fromEntries(mgrPillarEntries.filter((e): e is [string, number] => e[1] !== undefined)),
    } as HistoryPoint
  })

  const inProgressScores = inProgress ? await getScoresForRound(inProgress.id) : []
  const scoredPillarCount = new Set(inProgressScores.map(s => s.pillar)).size
  const currentNextRoundTitle = computeNextRoundTitle()

  return (
    <div className="p-6">
      <ManagerStrip summaries={enrichedDRs} />
      {isManager && <DashboardManagerTour hasManagerStrip={enrichedDRs.length > 0} />}
      <DashboardResults
        pillarScoresForRadar={pillarScoresForRadar}
        hasManagerScores={hasManagerScores}
        pillarsForAccordion={pillarsForAccordion}
        historyData={historyData}
        overallAvg={overallAvg}
        overallManagerAvg={overallManagerAvg}
        roundDate={roundDate}
        inProgressRound={inProgress}
        scoredPillarCount={scoredPillarCount}
        nextRoundTitle={currentNextRoundTitle}
        plans={plans}
        overdueCount={overdueCheckins.length}
      />
    </div>
  )
}
