// app/(app)/dashboard/page.tsx
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getLatestCompleteRound, getPreviousCompleteRound, getInProgressRound } from '@/lib/db/rounds'
import { getScoresForRound } from '@/lib/db/scores'
import { getManagerScoresForDirectReport } from '@/lib/db/manager-scores'
import { getPlansForUser } from '@/lib/db/development-plans'
import { getScheduledRound } from '@/lib/db/scheduled-rounds'
import {
  PILLARS,
  PILLAR_LABELS,
  getSkillsByPillar,
  LEVEL_VALUES,
  type Pillar,
  type Level,
} from '@/lib/skills'
import { RadarWithToggle } from '@/components/app/RadarWithToggle'
import { PillarAccordion } from '@/components/app/PillarAccordion'
import type { PillarData } from '@/components/app/PillarAccordion'
import { ScheduleWidget } from '@/components/app/ScheduleWidget'
import { GrowthSummaryCard } from '@/components/app/GrowthSummaryCard'

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const round = await getLatestCompleteRound(user.id)

  // ── Empty state ──────────────────────────────────────────────────────────────
  if (!round) {
    return (
      <div className="flex flex-col items-start gap-4 py-16 px-4">
        <h1 className="text-2xl font-bold text-white">Welcome to Brilliant Managers</h1>
        <p className="text-sm text-slate-400">
          Your dashboard will come alive once you&apos;ve completed your first self-assessment.
        </p>
        <Link
          href="/scorecard"
          className="rounded-lg bg-amber-500 px-6 py-3 text-sm font-semibold text-white hover:bg-amber-400"
        >
          Start your scorecard →
        </Link>
      </div>
    )
  }

  // ── Parallel data fetch ───────────────────────────────────────────────────────
  const [scores, managerScores, plans, scheduled, inProgress] = await Promise.all([
    getScoresForRound(round.id),
    getManagerScoresForDirectReport(round.id),
    getPlansForUser(user.id),
    getScheduledRound(user.id),
    getInProgressRound(user.id),
  ])

  const hasManagerScores = managerScores.length > 0

  // ── Overall score + trend ────────────────────────────────────────────────────
  const overallAvg =
    scores.length > 0
      ? scores.reduce((sum, s) => sum + LEVEL_VALUES[s.level as Level], 0) / scores.length
      : 0

  const roundDate = new Date(round.completed_at ?? round.created_at).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  })

  // Trend: fetch previous round's scores if it exists
  const prevRound = round.completed_at
    ? await getPreviousCompleteRound(user.id, round.completed_at)
    : null
  let trend: { delta: number } | null = null
  if (prevRound) {
    const prevScores = await getScoresForRound(prevRound.id)
    if (prevScores.length > 0) {
      const prevAvg =
        prevScores.reduce((sum, s) => sum + LEVEL_VALUES[s.level as Level], 0) / prevScores.length
      trend = { delta: overallAvg - prevAvg }
    }
  }

  // ── Pillar data (radar + accordion) ─────────────────────────────────────────
  const activePlanKeys = new Set(
    plans.filter(p => p.status === 'planned' || p.status === 'in_progress').map(p => p.skill_key)
  )
  const planGoalByKey = Object.fromEntries(
    plans.filter(p => p.status !== 'completed').map(p => [p.skill_key, p.goal])
  )

  const pillarScoresForRadar = PILLARS.map(pillar => {
    const pillarSkills = getSkillsByPillar(pillar as Pillar)
    const pillarSelfScores = scores.filter(s => s.pillar === pillar)
    const selfAvg =
      pillarSelfScores.length > 0
        ? pillarSelfScores.reduce((sum, s) => sum + LEVEL_VALUES[s.level as Level], 0) /
          pillarSelfScores.length
        : 0

    const managerPillarScores = managerScores.filter(ms =>
      pillarSkills.some(s => s.key === ms.skill_key)
    )
    const managerAvg =
      managerPillarScores.length > 0
        ? managerPillarScores.reduce((sum, ms) => sum + LEVEL_VALUES[ms.level as Level], 0) /
          managerPillarScores.length
        : undefined

    return { pillar: pillar as Pillar, selfScore: selfAvg, managerScore: managerAvg }
  })

  const pillarScoreMap = Object.fromEntries(
    pillarScoresForRadar.map(p => [p.pillar, p.selfScore])
  )
  const lowestPillar = PILLARS.reduce((lowest, p) =>
    pillarScoreMap[p] < pillarScoreMap[lowest] ? p : lowest
  )

  const pillarsForAccordion: PillarData[] = PILLARS.map(pillar => {
    const pillarSkills = getSkillsByPillar(pillar as Pillar)
    const pillarSelfScores = scores.filter(s => s.pillar === pillar)
    const selfAvg = pillarScoresForRadar.find(p => p.pillar === pillar)?.selfScore ?? 0

    return {
      pillar,
      label: PILLAR_LABELS[pillar as Pillar],
      score: selfAvg,
      isLowest: pillar === lowestPillar,
      skills: pillarSkills.map(skill => {
        const selfScore = pillarSelfScores.find(s => s.skill_key === skill.key)
        const level = (selfScore?.level ?? 'Basic') as Level
        const score = LEVEL_VALUES[level]
        const hasActiveGoal = activePlanKeys.has(skill.key)
        let chipType: 'opportunity' | 'goal' | null = null
        if (hasActiveGoal) chipType = 'goal'
        else if (score <= 2) chipType = 'opportunity'
        return {
          key: skill.key,
          name: skill.label,
          description: skill.description,
          level,
          score,
          chipType,
          goalText: hasActiveGoal ? planGoalByKey[skill.key] : undefined,
        }
      }),
    }
  })

  const showStartNewRound = !inProgress

  return (
    <div className="p-6">
      {/* Three-column grid, collapses to single column on medium screens */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-[220px_1fr_260px]">

        {/* ── Left: Radar + score ──────────────────────────────────────────── */}
        <aside className="flex flex-col gap-4">
          <RadarWithToggle
            pillarScores={pillarScoresForRadar}
            hasManagerScores={hasManagerScores}
          />

          {/* Overall score chip */}
          <div className="rounded-xl bg-slate-800 px-4 py-3 text-center">
            <p className="text-3xl font-bold text-amber-400">{overallAvg.toFixed(1)}</p>
            <p className="text-xs text-slate-400">Overall score</p>
            <p className="mt-0.5 text-xs text-slate-500">{roundDate}</p>
          </div>

          {/* Trend chip */}
          {trend !== null && (
            <div
              className="rounded-xl px-4 py-2 text-center text-sm font-semibold"
              style={
                trend.delta >= 0
                  ? { background: 'rgba(74,222,128,0.1)', color: '#4ade80' }
                  : { background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }
              }
            >
              {trend.delta >= 0 ? '+' : ''}
              {trend.delta.toFixed(1)} {trend.delta >= 0 ? '↑' : '↓'}
            </div>
          )}
        </aside>

        {/* ── Centre: Pillar accordion ─────────────────────────────────────── */}
        <main className="min-w-0">
          <PillarAccordion pillars={pillarsForAccordion} />
        </main>

        {/* ── Right: Action cards ──────────────────────────────────────────── */}
        <aside className="flex flex-col gap-4">
          <ScheduleWidget scheduled={scheduled} />
          <GrowthSummaryCard plans={plans} />

          {!hasManagerScores && (
            <div
              className="rounded-xl px-5 py-4"
              style={{ background: '#1e3a5f', border: '1px solid rgba(245,158,11,0.2)' }}
            >
              <p className="mb-1 text-sm font-semibold text-white">Invite your manager</p>
              <p className="mb-3 text-xs text-slate-400">
                They score you independently, then you compare.
              </p>
              <Link
                href="/connections"
                className="text-xs font-semibold text-amber-400 hover:text-amber-300"
              >
                Connect →
              </Link>
            </div>
          )}

          {showStartNewRound && (
            <Link
              href="/scorecard"
              className="text-center text-xs text-slate-500 hover:text-slate-300"
            >
              Start new round →
            </Link>
          )}
        </aside>
      </div>
    </div>
  )
}
