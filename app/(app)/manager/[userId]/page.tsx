import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getLatestCompleteRound, getRoundById } from '@/lib/db/rounds'
import { getManagerScoresForRound } from '@/lib/db/manager-scores'
import { getSignedAvatarUrl, getProfile } from '@/lib/db/profiles'
import { SKILLS, type Level } from '@/lib/skills'
import { getSkillGuideContent } from '@/lib/guide-content'
import type { SkillGuideContent } from '@/lib/guide-content'
import { ManagerScorecardShell } from '@/components/app/manager/ManagerScorecardShell'

function shouldFetchDrScores(isBlindMode: boolean, roundStatus: string): boolean {
  return !isBlindMode && roundStatus === 'complete'
}

export default async function ManagerPage({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string }>
  searchParams: Promise<{ roundId?: string }>
}) {
  const { userId } = await params
  const { roundId: roundIdParam } = await searchParams

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

  const managerScoreRows = await getManagerScoresForRound(round.id, user.id)
  const allManagerScores: Record<string, Level> = Object.fromEntries(
    managerScoreRows.map(ms => [ms.skill_key, ms.level])
  )

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

  const directReportName = profile?.display_name ?? profile?.email ?? 'your direct report'

  return (
    <div>
      <div className="mb-2 flex items-center gap-3">
        {directReportAvatarUrl && (
          <img
            src={directReportAvatarUrl}
            alt={directReportName}
            style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
          />
        )}
        <div>
          <h1 className="text-2xl font-bold text-white">Scoring {directReportName}</h1>
          <p className="text-sm text-slate-400">Scores save automatically.</p>
        </div>
      </div>
      <ManagerScorecardShell
        roundId={round.id}
        allManagerScores={allManagerScores}
        directReportScores={directReportScores}
        allGuideContent={allGuideContent}
      />
    </div>
  )
}
