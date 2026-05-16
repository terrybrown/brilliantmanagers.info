import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getOrCreateActiveRound, getLatestCompleteRound } from '@/lib/db/rounds'
import { getScoresForRound } from '@/lib/db/scores'
import { PILLARS, PILLAR_LABELS, getSkillsByPillar, LEVEL_VALUES, type Pillar, type Level } from '@/lib/skills'

function pillarAvg(scores: { level: Level }[]): number {
  if (scores.length === 0) return 0
  return scores.reduce((sum, s) => sum + LEVEL_VALUES[s.level], 0) / scores.length
}

export default async function ScorecardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const round = await getOrCreateActiveRound(user.id)
  const scores = await getScoresForRound(round.id)
  const hasCompleteRound = !!(await getLatestCompleteRound(user.id))

  return (
    <div className="dark min-h-screen" style={{ background: '#0f172a' }}>
      <div className="mx-auto max-w-2xl px-4 py-12">
        <h1 className="mb-2 text-2xl font-bold text-white">Your Scorecard</h1>
        <p className="mb-8 text-sm text-slate-400">
          Score yourself on each pillar. Scores save automatically.
        </p>

        <div className="flex flex-col gap-3">
          {PILLARS.map(pillar => {
            const pillarSkills = getSkillsByPillar(pillar as Pillar)
            const pillarScores = scores.filter(s => s.pillar === pillar)
            const scored = pillarScores.length
            const total = pillarSkills.length
            const complete = scored === total
            const avg = complete ? pillarAvg(pillarScores as { level: Level }[]) : null

            return (
              <Link
                key={pillar}
                href={`/scorecard/${pillar}`}
                className="flex items-center gap-4 rounded-xl px-5 py-4 transition-colors"
                style={{ background: '#1e293b' }}
              >
                <span className="flex-1 font-medium text-white">
                  {PILLAR_LABELS[pillar as Pillar]}
                </span>
                {scored > 0 && !complete && (
                  <span className="text-xs text-slate-500">
                    {scored}/{total}
                  </span>
                )}
                {complete && avg !== null && (
                  <span
                    className="rounded-full px-3 py-1 text-xs font-semibold"
                    style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}
                  >
                    {avg.toFixed(1)}
                  </span>
                )}
                <span className="text-slate-600">›</span>
              </Link>
            )
          })}
        </div>

        {hasCompleteRound && (
          <div className="mt-8 text-center">
            <Link
              href="/results"
              className="text-sm font-semibold text-amber-400 hover:text-amber-300"
            >
              View results →
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
