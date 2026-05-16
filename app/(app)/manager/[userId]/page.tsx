import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getLatestCompleteRound } from '@/lib/db/rounds'
import { getManagerScoresForRound } from '@/lib/db/manager-scores'
import { PILLARS, PILLAR_LABELS, getSkillsByPillar, type Pillar, type Level } from '@/lib/skills'
import { ManagerScoringView } from '@/components/app/ManagerScoringView'

export default async function ManagerPage({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string }>
  searchParams: Promise<{ pillar?: string }>
}) {
  const { userId } = await params
  const { pillar } = await searchParams

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: connection } = await supabase
    .from('connections')
    .select('*')
    .eq('manager_id', user.id)
    .eq('direct_report_id', userId)
    .eq('status', 'active')
    .maybeSingle()
  if (!connection) notFound()

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, email')
    .eq('id', userId)
    .single()

  const round = await getLatestCompleteRound(userId)
  if (!round) {
    return (
      <div
        className="dark flex min-h-screen items-center justify-center"
        style={{ background: '#0f172a' }}
      >
        <p className="text-slate-400">
          {profile?.display_name ?? 'This person'} hasn't completed a self-assessment yet.
        </p>
      </div>
    )
  }

  if (!pillar || !PILLARS.includes(pillar as Pillar)) {
    const managerScores = await getManagerScoresForRound(round.id, user.id)
    const scoredPillars = new Set(
      PILLARS.filter(p =>
        getSkillsByPillar(p as Pillar).every(s =>
          managerScores.some(ms => ms.skill_key === s.key)
        )
      )
    )

    return (
      <div className="dark min-h-screen" style={{ background: '#0f172a' }}>
        <div className="mx-auto max-w-2xl px-4 py-12">
          <h1 className="mb-2 text-2xl font-bold text-white">
            Scoring {profile?.display_name ?? profile?.email}
          </h1>
          <p className="mb-8 text-sm text-slate-400">Select a pillar to score.</p>
          <div className="flex flex-col gap-3">
            {PILLARS.map(p => (
              <Link
                key={p}
                href={`/manager/${userId}?pillar=${p}`}
                className="flex items-center gap-4 rounded-xl bg-slate-800 px-5 py-4"
              >
                <span className="flex-1 font-medium text-white">
                  {PILLAR_LABELS[p as Pillar]}
                </span>
                {scoredPillars.has(p) && (
                  <span className="text-xs text-green-400">✓ scored</span>
                )}
                <span className="text-slate-600">›</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const skills = getSkillsByPillar(pillar as Pillar)
  const managerScores = await getManagerScoresForRound(round.id, user.id)
  const initialScores: Record<string, Level> = {}
  managerScores
    .filter(ms => skills.some(s => s.key === ms.skill_key))
    .forEach(ms => {
      initialScores[ms.skill_key] = ms.level
    })

  return (
    <div className="dark min-h-screen" style={{ background: '#0f172a' }}>
      <ManagerScoringView
        roundId={round.id}
        pillar={pillar}
        pillarLabel={PILLAR_LABELS[pillar as Pillar]}
        skills={skills}
        initialScores={initialScores}
        directReportName={profile?.display_name ?? profile?.email ?? 'your direct report'}
        userId={userId}
      />
    </div>
  )
}
