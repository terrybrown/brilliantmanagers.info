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
import { ResultsView } from '@/components/app/ResultsView'

export default async function ResultsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const round = await getLatestCompleteRound(user.id)
  if (!round) redirect('/scorecard')

  const scores = await getScoresForRound(round.id)
  const managerScores = await getManagerScoresForDirectReport(round.id)
  const hasManagerScores = managerScores.length > 0

  const pillarScores = PILLARS.map(pillar => {
    const pillarSkills = getSkillsByPillar(pillar as Pillar)
    const selfScores = scores.filter(s => s.pillar === pillar)
    const selfAvg =
      selfScores.length > 0
        ? selfScores.reduce((sum, s) => sum + LEVEL_VALUES[s.level as Level], 0) / selfScores.length
        : 0

    const managerPillarScores = managerScores.filter(ms =>
      pillarSkills.some(s => s.key === ms.skill_key)
    )
    const managerAvg =
      managerPillarScores.length > 0
        ? managerPillarScores.reduce((sum, ms) => sum + LEVEL_VALUES[ms.level as Level], 0) /
          managerPillarScores.length
        : undefined

    return {
      pillar: pillar as Pillar,
      selfScore: selfAvg,
      managerScore: managerAvg,
      skills: pillarSkills.map(skill => {
        const selfScore = selfScores.find(s => s.skill_key === skill.key)
        const managerScore = managerScores.find(ms => ms.skill_key === skill.key)
        return {
          skillKey: skill.key,
          label: skill.label,
          selfLevel: (selfScore?.level ?? 'Basic') as Level,
          managerLevel: managerScore ? (managerScore.level as Level) : undefined,
        }
      }),
    }
  })

  return (
    <div className="dark min-h-screen" style={{ background: '#0f172a' }}>
      <div className="mx-auto max-w-2xl px-4 py-12">
        <div className="mb-6 flex items-center gap-4">
          <h1 className="flex-1 text-2xl font-bold text-white">Your Results</h1>
          <Link href="/scorecard" className="text-sm text-slate-400 hover:text-white">
            Retake →
          </Link>
        </div>

        <ResultsView pillarScores={pillarScores} hasManagerScores={hasManagerScores} />

        {!hasManagerScores && (
          <div
            className="mt-6 flex items-center justify-between rounded-xl px-5 py-4"
            style={{ background: '#1e3a5f', border: '1px solid rgba(245,158,11,0.2)' }}
          >
            <div>
              <p className="text-sm font-semibold text-white">Invite your manager</p>
              <p className="text-xs text-slate-400">
                They score you independently, then you compare
              </p>
            </div>
            <Link
              href="/connections"
              className="text-sm font-semibold text-amber-400 hover:text-amber-300"
            >
              Connect →
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
