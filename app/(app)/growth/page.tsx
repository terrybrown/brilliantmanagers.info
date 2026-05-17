import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getLatestCompleteRound } from '@/lib/db/rounds'
import { getScoresForRound } from '@/lib/db/scores'
import { getPlansForUser } from '@/lib/db/development-plans'
import { SKILLS, PILLAR_LABELS, LEVEL_VALUES, type Pillar, type Level } from '@/lib/skills'
import { ActiveGoalsPanel } from '@/components/app/ActiveGoalsPanel'
import { OpportunitiesPanel } from '@/components/app/OpportunitiesPanel'
import { SkillsTable } from '@/components/app/SkillsTable'
import type { SkillRow } from '@/components/app/SkillsTable'

export default async function GrowthPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const round = await getLatestCompleteRound(user.id)
  const [scores, plans] = await Promise.all([
    round ? getScoresForRound(round.id) : Promise.resolve([]),
    getPlansForUser(user.id),
  ])

  const activePlanKeys = new Set(
    plans.filter(p => p.status !== 'completed').map(p => p.skill_key)
  )

  const scoreByKey = Object.fromEntries(scores.map(s => [s.skill_key, s]))

  // Top 5 lowest-scoring skills with no active plan
  const opportunities = SKILLS
    .filter(s => !activePlanKeys.has(s.key))
    .map(s => {
      const score = scoreByKey[s.key]
      const level = (score?.level ?? 'Basic') as Level
      return { key: s.key, label: s.label, pillar: s.pillar as Pillar, level, score: LEVEL_VALUES[level] }
    })
    .sort((a, b) => a.score - b.score)
    .slice(0, 5)

  const tableRows: SkillRow[] = SKILLS.map(s => {
    const score = scoreByKey[s.key]
    const level = (score?.level ?? 'Basic') as Level
    const numScore = LEVEL_VALUES[level]
    const hasGoal = activePlanKeys.has(s.key)
    let status: SkillRow['status'] = null
    if (hasGoal) status = 'goal'
    else if (numScore <= 2) status = 'opportunity'
    return {
      key: s.key,
      label: s.label,
      pillar: s.pillar as Pillar,
      pillarLabel: PILLAR_LABELS[s.pillar as Pillar],
      level,
      score: numScore,
      status,
    }
  })

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Growth</h1>
        <p className="mt-1 text-sm text-slate-400">
          Set focused goals for the skills you want to develop.
        </p>
      </div>

      {/* Top two-column section */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ActiveGoalsPanel plans={plans} />
        <OpportunitiesPanel opportunities={opportunities} />
      </div>

      {/* All-skills table */}
      <SkillsTable rows={tableRows} />
    </div>
  )
}
