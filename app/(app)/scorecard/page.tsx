import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getOrCreateActiveRound } from '@/lib/db/rounds'
import { getScoresForRound } from '@/lib/db/scores'
import type { Level } from '@/lib/skills'
import { SKILLS } from '@/lib/skills'
import { getSkillGuideContent } from '@/lib/guide-content'
import type { SkillGuideContent } from '@/lib/guide-content'
import { ScorecardShell } from '@/components/app/scorecard/ScorecardShell'

export default async function ScorecardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const round = await getOrCreateActiveRound(user.id)
  const scores = await getScoresForRound(round.id)

  const allScores: Record<string, Level> = {}
  scores.forEach(s => {
    allScores[s.skill_key] = s.level
  })

  const guideEntries = await Promise.all(
    SKILLS.map(async s => {
      try {
        return [s.key, await getSkillGuideContent(s.key)] as const
      } catch {
        return [s.key, null] as const
      }
    })
  )
  const allGuideContent: Record<string, SkillGuideContent | null> = Object.fromEntries(guideEntries)

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-white">Your Scorecard</h1>
      <p className="mb-6 text-sm text-slate-400">
        Score yourself on each skill. Scores save automatically.
      </p>
      <ScorecardShell roundId={round.id} allScores={allScores} allGuideContent={allGuideContent} />
    </div>
  )
}
