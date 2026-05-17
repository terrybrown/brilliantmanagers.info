import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getLatestCompleteRound } from '@/lib/db/rounds'
import { getScoresForRound } from '@/lib/db/scores'
import { getManagerScoresForDirectReport } from '@/lib/db/manager-scores'
import {
  PILLARS,
  PILLAR_LABELS,
  getSkillsByPillar,
  LEVEL_VALUES,
  type Pillar,
  type Level,
} from '@/lib/skills'

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const round = await getLatestCompleteRound(user.id)

  if (!round) {
    return (
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-2 text-2xl font-bold text-white">Welcome</h1>
        <p className="mb-8 text-sm text-slate-400">
          Start your first self-assessment to see your results here.
        </p>
        <Link
          href="/scorecard"
          className="inline-block rounded-lg bg-amber-500 px-6 py-3 text-sm font-semibold text-white hover:bg-amber-400"
        >
          Start scorecard →
        </Link>
      </div>
    )
  }

  const scores = await getScoresForRound(round.id)
  const managerScores = await getManagerScoresForDirectReport(round.id)

  const overallAvg =
    scores.length > 0
      ? scores.reduce((sum, s) => sum + LEVEL_VALUES[s.level as Level], 0) / scores.length
      : 0

  const hasManagerFeedback = managerScores.length > 0

  const pillarData = PILLARS.map(pillar => {
    const pillarSkills = getSkillsByPillar(pillar as Pillar)
    const pillarScores = scores.filter(s => s.pillar === pillar)
    const avg =
      pillarScores.length > 0
        ? pillarScores.reduce((sum, s) => sum + LEVEL_VALUES[s.level as Level], 0) /
          pillarScores.length
        : 0
    return {
      pillar: pillar as Pillar,
      label: PILLAR_LABELS[pillar as Pillar],
      avg,
      complete: pillarScores.length === pillarSkills.length,
    }
  })

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-8 text-2xl font-bold text-white">Dashboard</h1>

      <div className="mb-8 grid grid-cols-3 gap-4">
        <StatCard label="Overall score" value={overallAvg.toFixed(1)} />
        <StatCard label="Pillars assessed" value={`${PILLARS.length}`} />
        <StatCard
          label="Manager feedback"
          value={hasManagerFeedback ? 'Received' : 'Pending'}
          muted={!hasManagerFeedback}
        />
      </div>

      <section className="mb-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-400">
          Pillar scores
        </h2>
        <div className="flex flex-col gap-3">
          {pillarData.map(({ pillar, label, avg }) => (
            <div key={pillar} className="rounded-xl bg-slate-800 px-5 py-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium text-white">{label}</span>
                <span className="text-xs text-amber-400">{avg.toFixed(1)}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-700">
                <div
                  className="h-1.5 rounded-full bg-amber-500 transition-all"
                  style={{ width: `${(avg / 4) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="mb-6 text-right">
        <Link href="/results" className="text-sm font-semibold text-amber-400 hover:text-amber-300">
          View full results →
        </Link>
      </div>

      <div
        className="flex items-center justify-between rounded-xl px-5 py-4"
        style={{ background: '#1e3a5f', border: '1px solid rgba(245,158,11,0.2)' }}
      >
        <div>
          <p className="text-sm font-semibold text-white">Set a growth goal</p>
          <p className="text-xs text-slate-400">
            Track focused areas and the steps you&apos;re taking to improve
          </p>
        </div>
        <Link href="/growth" className="text-sm font-semibold text-amber-400 hover:text-amber-300">
          Explore →
        </Link>
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  muted,
}: {
  label: string
  value: string
  muted?: boolean
}) {
  return (
    <div className="rounded-xl bg-slate-800 px-4 py-4 text-center">
      <p className={`text-xl font-bold ${muted ? 'text-slate-500' : 'text-amber-400'}`}>
        {value}
      </p>
      <p className="mt-1 text-xs text-slate-400">{label}</p>
    </div>
  )
}
