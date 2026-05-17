import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getLatestCompleteRound } from '@/lib/db/rounds'
import { getScoresForRound } from '@/lib/db/scores'
import { getPlansForUser } from '@/lib/db/development-plans'
import { SKILLS, PILLAR_LABELS, type Pillar, type Level } from '@/lib/skills'
import { GrowthView } from '@/components/app/GrowthView'

export default async function GrowthPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const round = await getLatestCompleteRound(user.id)
  const scores = round ? await getScoresForRound(round.id) : []
  const plans = await getPlansForUser(user.id)

  const planKeys = new Set(plans.map(p => p.skill_key))

  const skillOptions = SKILLS.map(skill => {
    const score = scores.find(s => s.skill_key === skill.key)
    return {
      key: skill.key,
      label: skill.label,
      pillar: skill.pillar as Pillar,
      pillarLabel: PILLAR_LABELS[skill.pillar as Pillar],
      selfLevel: score?.level as Level | undefined,
      hasPlan: planKeys.has(skill.key),
    }
  })

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-2 text-2xl font-bold text-white">Growth</h1>
      <p className="mb-8 text-sm text-slate-400">
        Set focused goals for the skills you want to develop.
      </p>

      <GrowthView skills={skillOptions} plans={plans} hasRound={!!round} />
    </div>
  )
}
