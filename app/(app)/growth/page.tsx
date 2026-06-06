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
    <div style={{ maxWidth: 1180, margin: '0 auto', padding: '24px 28px 40px' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 750, color: 'var(--color-text-primary)', margin: 0 }}>Growth</h1>
        <p style={{ marginTop: 4, fontSize: 13.5, color: 'var(--color-text-muted)', margin: '4px 0 0' }}>
          Set focused goals for the skills you want to develop.
        </p>
      </div>

      {/* Top two-column section */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2" style={{ alignItems: 'start' }}>
        <ActiveGoalsPanel plans={plans} />
        <OpportunitiesPanel opportunities={opportunities} />
      </div>

      {/* All-skills table */}
      <div style={{ marginTop: 30 }}>
        <SkillsTable rows={tableRows} />
      </div>
    </div>
  )
}
