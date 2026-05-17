// app/(app)/dashboard/page.tsx
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Lightbulb, Search, TrendingUp, MessageSquare, type LucideIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { DashboardTour } from '@/components/dashboard/DashboardTour'
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
import { CheckInNudgeCard } from '@/components/app/CheckInNudgeCard'

const BENEFIT_STRIPS: Array<{ Icon: LucideIcon; title: string; desc: string }> = [
  {
    Icon: Lightbulb,
    title: 'See exactly where you stand',
    desc: 'A radar across all six pillars shows your strengths and gaps at a glance.',
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

  const round = await getLatestCompleteRound(user.id)

  // ── Empty state ──────────────────────────────────────────────────────────────
  if (!round) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {/* CTA area */}
        <div style={{ padding: '40px 36px 0' }}>
          <DashboardTour />

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
              minutes of honest self-assessment across six pillars gives you a structured picture
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

        {/* Benefit strips — full width of main panel */}
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

  // ── Parallel data fetch ───────────────────────────────────────────────────────
  const [scores, managerScores, plans, scheduled, inProgress] = await Promise.all([
    getScoresForRound(round.id),
    getManagerScoresForDirectReport(round.id),
    getPlansForUser(user.id),
    getScheduledRound(user.id),
    getInProgressRound(user.id),
  ])

  const hasManagerScores = managerScores.length > 0

  const overdueCheckins = plans.filter(p => {
    if (p.status === 'completed' || !p.checkin_frequency_weeks) return false
    const base = p.last_checkin_at ? new Date(p.last_checkin_at) : new Date(p.created_at)
    const nextDue = new Date(base.getTime() + p.checkin_frequency_weeks * 7 * 24 * 60 * 60 * 1000)
    return nextDue < new Date()
  })

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
          <CheckInNudgeCard overdueCount={overdueCheckins.length} />

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
