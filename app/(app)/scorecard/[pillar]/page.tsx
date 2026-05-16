import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getOrCreateActiveRound } from '@/lib/db/rounds'
import { getScoresForRound } from '@/lib/db/scores'
import { PILLARS, PILLAR_LABELS, getSkillsByPillar, type Pillar, type Level } from '@/lib/skills'
import { ScoringView } from '@/components/app/ScoringView'

export default async function PillarPage({
  params,
}: {
  params: Promise<{ pillar: string }>
}) {
  const { pillar } = await params

  if (!PILLARS.includes(pillar as Pillar)) notFound()

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const round = await getOrCreateActiveRound(user.id)
  const scores = await getScoresForRound(round.id)
  const skills = getSkillsByPillar(pillar as Pillar)

  const initialScores: Record<string, Level> = {}
  scores
    .filter(s => s.pillar === pillar)
    .forEach(s => {
      initialScores[s.skill_key] = s.level
    })

  return (
    <div className="dark min-h-screen" style={{ background: '#0f172a' }}>
      <ScoringView
        roundId={round.id}
        pillar={pillar}
        pillarLabel={PILLAR_LABELS[pillar as Pillar]}
        skills={skills}
        initialScores={initialScores}
      />
    </div>
  )
}
