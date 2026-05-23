import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getLatestCompleteRound, getRoundById } from '@/lib/db/rounds'
import { getManagerScoresForRound } from '@/lib/db/manager-scores'
import { getSignedAvatarUrl, getProfile } from '@/lib/db/profiles'
import { PILLARS, PILLAR_LABELS, getSkillsByPillar, type Pillar, type Level } from '@/lib/skills'
import { ManagerScoringView } from '@/components/app/ManagerScoringView'

function shouldFetchDrScores(isBlindMode: boolean, roundStatus: string): boolean {
  return !isBlindMode && roundStatus === 'complete'
}

export default async function ManagerPage({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string }>
  searchParams: Promise<{ pillar?: string; roundId?: string }>
}) {
  const { userId } = await params
  const { pillar, roundId: roundIdParam } = await searchParams

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
    .select('display_name, email, avatar_path')
    .eq('id', userId)
    .single()

  const directReportAvatarUrl = profile?.avatar_path
    ? await getSignedAvatarUrl(profile.avatar_path)
    : null

  let round = roundIdParam ? await getRoundById(roundIdParam, userId) : null
  if (!round) {
    round = await getLatestCompleteRound(userId)
  }

  if (round?.status === 'scheduled') {
    return (
      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="mb-4 text-xl font-bold">{profile?.display_name ?? profile?.email}</h1>
        <p className="text-neutral-400">
          {profile?.display_name ?? profile?.email ?? 'This person'} has a round scheduled but
          hasn&apos;t started their self-assessment yet. Check back once they begin.
        </p>
      </main>
    )
  }

  if (!round) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-slate-400">
          {profile?.display_name ?? 'This person'} hasn&apos;t started a round yet.
        </p>
      </div>
    )
  }

  const managerProfile = await getProfile(user.id)
  const isBlindMode = managerProfile?.manager_scoring_blind ?? false

  let directReportScores: Record<string, Level> | null = null
  if (shouldFetchDrScores(isBlindMode, round.status)) {
    const { data: scoreRows } = await supabase
      .from('scores')
      .select('skill_key, level')
      .eq('round_id', round.id)
    if (scoreRows) {
      directReportScores = Object.fromEntries(
        scoreRows.map(s => [s.skill_key, s.level as Level])
      )
    }
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
      <div className="mx-auto max-w-5xl">
        <div className="mb-2 flex items-center gap-3">
          {directReportAvatarUrl && (
            <img
              src={directReportAvatarUrl}
              alt={profile?.display_name ?? profile?.email ?? ''}
              style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
            />
          )}
          <h1 className="text-2xl font-bold text-white">
            Scoring {profile?.display_name ?? profile?.email}
          </h1>
        </div>
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
    <ManagerScoringView
      roundId={round.id}
      pillar={pillar}
      pillarLabel={PILLAR_LABELS[pillar as Pillar]}
      skills={skills}
      initialScores={initialScores}
      directReportName={profile?.display_name ?? profile?.email ?? 'your direct report'}
      userId={userId}
      directReportScores={directReportScores}
      isBlindMode={isBlindMode}
    />
  )
}
