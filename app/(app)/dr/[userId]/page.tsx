import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAllCompleteRoundsWithScores } from '@/lib/db/rounds'
import { getManagerScoresForRound, getManagerScoresForAllRounds } from '@/lib/db/manager-scores'
import { getProfile } from '@/lib/db/profiles'
import { computePillarScores } from '@/lib/reflections'
import {
  PILLARS,
  PILLAR_LABELS,
  getSkillsByPillar,
  LEVEL_VALUES,
  type Pillar,
  type Level,
} from '@/lib/skills'
import { DashboardResults } from '@/components/dashboard/DashboardResults'
import type { PillarData } from '@/components/app/PillarAccordion'
import type { HistoryPoint } from '@/components/app/PillarHistoryChart'

export default async function DrViewPage({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string }>
  searchParams: Promise<{ roundId?: string }>
}) {
  const { userId } = await params
  const { roundId: requestedRoundId } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: connection, error: connError } = await supabase
    .from('connections')
    .select('id')
    .eq('manager_id', user.id)
    .eq('direct_report_id', userId)
    .eq('status', 'active')
    .maybeSingle()
  if (connError) throw connError
  if (!connection) notFound()

  const profile = await getProfile(userId)
  const drName = profile?.display_name ?? profile?.email ?? 'Direct report'

  const allRoundsWithScores = await getAllCompleteRoundsWithScores(userId)

  if (allRoundsWithScores.length === 0) {
    return (
      <div className="p-6">
        <Link href="/dashboard" className="mb-4 block text-sm text-amber-400 hover:text-amber-300">
          ← Dashboard
        </Link>
        <p className="text-slate-400">{drName} hasn&apos;t completed a round yet.</p>
      </div>
    )
  }

  const targetRound = requestedRoundId
    ? (allRoundsWithScores.find(r => r.round.id === requestedRoundId) ?? allRoundsWithScores[allRoundsWithScores.length - 1])
    : allRoundsWithScores[allRoundsWithScores.length - 1]
  const { round, scores } = targetRound
  const allRoundIds = allRoundsWithScores.map(r => r.round.id)

  const [managerScores, managerHistoryByRound] = await Promise.all([
    getManagerScoresForRound(round.id, user.id),
    getManagerScoresForAllRounds(allRoundIds),
  ])

  const overallAvg = scores.length > 0
    ? scores.reduce((sum, s) => sum + LEVEL_VALUES[s.level as Level], 0) / scores.length
    : 0

  const overallManagerAvg = managerScores.length > 0
    ? managerScores.reduce((sum, s) => sum + LEVEL_VALUES[s.level as Level], 0) / managerScores.length
    : undefined

  const roundDate = new Date(round.completed_at ?? round.created_at).toLocaleDateString('en-US', {
    month: 'short', year: 'numeric',
  })

  const pillarScoresForRadar = computePillarScores(scores, managerScores)

  const pillarScoreMap = Object.fromEntries(pillarScoresForRadar.map(p => [p.pillar, p.selfScore]))
  const lowestPillar = PILLARS.reduce((lowest, p) =>
    pillarScoreMap[p] < pillarScoreMap[lowest] ? p : lowest
  )

  const prevRoundData = allRoundsWithScores.length >= 2
    ? allRoundsWithScores[allRoundsWithScores.length - 2]
    : null
  const prevPillarScoreMap = prevRoundData
    ? Object.fromEntries(PILLARS.map(pillar => {
        const ps = prevRoundData.scores.filter(s => s.pillar === pillar)
        const avg = ps.length > 0
          ? ps.reduce((sum, s) => sum + LEVEL_VALUES[s.level as Level], 0) / ps.length
          : 0
        return [pillar, avg]
      }))
    : null

  const pillarsForAccordion: PillarData[] = PILLARS.map(pillar => {
    const pillarSkills = getSkillsByPillar(pillar as Pillar)
    const pillarSelfScores = scores.filter(s => s.pillar === pillar)
    const selfAvg = pillarScoresForRadar.find(p => p.pillar === pillar)?.selfScore ?? 0
    const managerPillarScore = pillarScoresForRadar.find(p => p.pillar === pillar)?.managerScore

    return {
      pillar,
      label: PILLAR_LABELS[pillar as Pillar],
      score: selfAvg,
      isLowest: pillar === lowestPillar,
      prevScore: prevPillarScoreMap?.[pillar],
      managerScore: managerPillarScore,
      skills: pillarSkills.map(skill => {
        const selfScore = pillarSelfScores.find(s => s.skill_key === skill.key)
        const level = (selfScore?.level ?? 'Basic') as Level
        const mgrScore = managerScores.find(ms => ms.skill_key === skill.key)
        return {
          key: skill.key,
          name: skill.label,
          description: skill.description,
          level,
          score: LEVEL_VALUES[level],
          chipType: null as null,
          managerLevel: mgrScore?.level as Level | undefined,
          managerScore: mgrScore ? LEVEL_VALUES[mgrScore.level as Level] : undefined,
        }
      }),
    }
  })

  const historyData: HistoryPoint[] = allRoundsWithScores.map(({ round: r, scores: s }) => {
    const date = new Date(r.completed_at ?? r.created_at).toLocaleDateString('en-US', {
      month: 'short', year: 'numeric',
    })
    const overall = s.length > 0
      ? s.reduce((sum, sc) => sum + LEVEL_VALUES[sc.level as Level], 0) / s.length
      : 0
    const pillarEntries = PILLARS.map(pillar => {
      const ps = s.filter(sc => sc.pillar === pillar)
      const avg = ps.length > 0
        ? ps.reduce((sum, sc) => sum + LEVEL_VALUES[sc.level as Level], 0) / ps.length
        : 0
      return [pillar, Number(avg.toFixed(2))]
    })
    // Filter manager history to only this manager's scores
    const mgrRoundScores = (managerHistoryByRound[r.id] ?? []).filter(ms => ms.manager_id === user.id)
    const mgrOverall = mgrRoundScores.length > 0
      ? mgrRoundScores.reduce((sum, ms) => sum + LEVEL_VALUES[ms.level as Level], 0) / mgrRoundScores.length
      : undefined
    const mgrPillarEntries = PILLARS.map(pillar => {
      const skillKeys = getSkillsByPillar(pillar as Pillar).map(sk => sk.key)
      const ps = mgrRoundScores.filter(ms => skillKeys.includes(ms.skill_key))
      const avg = ps.length > 0
        ? ps.reduce((sum, ms) => sum + LEVEL_VALUES[ms.level as Level], 0) / ps.length
        : undefined
      return [`mgr_${pillar}`, avg !== undefined ? Number(avg.toFixed(2)) : undefined]
    })
    return {
      date,
      overall: Number(overall.toFixed(2)),
      ...Object.fromEntries(pillarEntries),
      ...(mgrOverall !== undefined ? { mgr_overall: Number(mgrOverall.toFixed(2)) } : {}),
      ...Object.fromEntries(mgrPillarEntries.filter((e): e is [string, number] => e[1] !== undefined)),
    } as HistoryPoint
  })

  return (
    <div className="p-6">
      <Link href="/dashboard" className="mb-4 block text-sm text-amber-400 hover:text-amber-300">
        ← Dashboard
      </Link>
      <h1 className="mb-4 text-xl font-bold text-white">{drName}</h1>
      <DashboardResults
        pillarScoresForRadar={pillarScoresForRadar}
        hasManagerScores={managerScores.length > 0}
        pillarsForAccordion={pillarsForAccordion}
        historyData={historyData}
        overallAvg={overallAvg}
        overallManagerAvg={overallManagerAvg}
        roundDate={roundDate}
        inProgressRound={null}
        scoredPillarCount={0}
        nextRoundTitle=""
        plans={[]}
        overdueCount={0}
        isReadOnly
      />
    </div>
  )
}
