import { createAdminClient } from '@/lib/supabase/admin'
import { LEVEL_VALUES, PILLARS, getSkillsByPillar } from '@/lib/skills'
import type { Level, Pillar } from '@/lib/skills'
import { getManagerScoringStatus } from '@/lib/db/manager-scores'
import type { ManagerScoringStatus } from '@/lib/db/manager-scores'

export interface DirectReportRoundSummary {
  roundStatus: 'in_progress' | 'scheduled' | 'none'
  lastScore: number | null
  nextScheduledDate: string | null
  managerScoringStatus: ManagerScoringStatus
  roundId: string | null
  completedAt: string | null
  pillarsScored: number
}

export async function getDirectReportRoundSummaries(
  directReportIds: string[],
  managerId: string
): Promise<Record<string, DirectReportRoundSummary>> {
  if (directReportIds.length === 0) return {}

  const admin = createAdminClient()

  const entries = await Promise.all(
    directReportIds.map(async (userId) => {
      // assessment_rounds RLS is scoped to auth.uid() = user_id, so managers
      // cannot read DR rounds through the anon client — use admin throughout.
      const { data: inProgressRound } = await admin
        .from('assessment_rounds')
        .select('id')
        .eq('user_id', userId)
        .eq('status', 'in_progress')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      const inProgress = inProgressRound ?? null

      const { data: scheduledRound } = await admin
        .from('scheduled_rounds')
        .select('scheduled_date')
        .eq('user_id', userId)
        .maybeSingle()
      const scheduled = scheduledRound ?? null

      const roundStatus: DirectReportRoundSummary['roundStatus'] =
        inProgress ? 'in_progress' : scheduled ? 'scheduled' : 'none'

      // Most recent complete round
      const { data: lastRound } = await admin
        .from('assessment_rounds')
        .select('id, completed_at')
        .eq('user_id', userId)
        .eq('status', 'complete')
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      const completedAt = lastRound?.completed_at ?? null

      let lastScore: number | null = null
      if (lastRound) {
        const { data: scoreRows } = await admin
          .from('scores')
          .select('level')
          .eq('round_id', lastRound.id)
        const levels = (scoreRows ?? []) as { level: Level }[]
        if (levels.length > 0) {
          const avg = levels.reduce((sum, s) => sum + LEVEL_VALUES[s.level], 0) / levels.length
          lastScore = Number(avg.toFixed(1))
        }
      }

      // Use the last complete round as the scoring target — the manager scores after the DR finishes.
      // Fall back to the in-progress round only when no complete round exists yet.
      const roundId = lastRound?.id ?? inProgress?.id ?? null

      let managerScoringStatus: ManagerScoringStatus = 'not_started'
      let pillarsScored = 0

      if (roundId) {
        const { data: mgrScores, error: mgrScoresError } = await admin
          .from('manager_scores')
          .select('skill_key')
          .eq('round_id', roundId)
          .eq('manager_id', managerId)

        if (mgrScoresError) throw mgrScoresError

        const scoredKeys = new Set((mgrScores ?? []).map(s => s.skill_key))
        const allKeys = PILLARS.flatMap(p => getSkillsByPillar(p).map(s => s.key))

        managerScoringStatus =
          scoredKeys.size === 0 ? 'not_started'
          : allKeys.every(k => scoredKeys.has(k)) ? 'complete'
          : 'in_progress'

        const scoredPillarsSet = new Set(
          [...scoredKeys]
            .map(key => PILLARS.find(p => getSkillsByPillar(p).some(s => s.key === key)))
            .filter((p): p is Pillar => p !== undefined)
        )
        pillarsScored = scoredPillarsSet.size
      }

      return [userId, {
        roundStatus,
        lastScore,
        nextScheduledDate: scheduled?.scheduled_date ?? null,
        managerScoringStatus,
        roundId,
        completedAt,
        pillarsScored,
      }] as [string, DirectReportRoundSummary]
    })
  )

  return Object.fromEntries(entries)
}

export interface TeamRoundSummary {
  roundId: string
  roundLabel: string
  roundStatus: 'in_progress' | 'complete' | 'scheduled'
  selfScore: number | null
  managerScore: number | null
  managerScoringStatus: ManagerScoringStatus
  pillarsScored: number
  completedAt: string | null
}

export interface TeamMemberSummary {
  directReportId: string
  rounds: TeamRoundSummary[]
  pendingScoringCount: number
}

export async function getTeamReflectionSummaries(
  directReportIds: string[],
  managerId: string
): Promise<TeamMemberSummary[]> {
  if (directReportIds.length === 0) return []

  const admin = createAdminClient()

  const { data: rounds } = await admin
    .from('assessment_rounds')
    .select('id, user_id, status, title, created_at, completed_at')
    .in('user_id', directReportIds)
    .order('created_at', { ascending: false })

  if (!rounds?.length) return []

  const allRoundIds = (rounds as { id: string }[]).map(r => r.id)
  const completedRoundIds = (rounds as { id: string; status: string }[])
    .filter(r => r.status === 'complete')
    .map(r => r.id)

  const { data: selfScoreRows } = completedRoundIds.length > 0
    ? await admin
        .from('scores')
        .select('round_id, level')
        .in('round_id', completedRoundIds)
        .order('round_id', { ascending: true })
    : { data: [] }

  const { data: mgrScoreRows } = await admin
    .from('manager_scores')
    .select('round_id, skill_key, level')
    .eq('manager_id', managerId)
    .in('round_id', allRoundIds)

  const selfScoresByRound = new Map<string, { level: string }[]>()
  for (const row of (selfScoreRows ?? []) as { round_id: string; level: string }[]) {
    const bucket = selfScoresByRound.get(row.round_id) ?? []
    bucket.push(row)
    selfScoresByRound.set(row.round_id, bucket)
  }

  const mgrScoresByRound = new Map<string, { skill_key: string; level: string }[]>()
  for (const row of (mgrScoreRows ?? []) as { round_id: string; skill_key: string; level: string }[]) {
    const bucket = mgrScoresByRound.get(row.round_id) ?? []
    bucket.push(row)
    mgrScoresByRound.set(row.round_id, bucket)
  }

  const allSkillKeys = PILLARS.flatMap(p => getSkillsByPillar(p).map(s => s.key))

  function computeRoundSummary(round: {
    id: string
    user_id: string
    status: string
    title: string | null
    created_at: string
    completed_at: string | null
  }): TeamRoundSummary {
    const status = round.status as TeamRoundSummary['roundStatus']

    let selfScore: number | null = null
    if (status === 'complete') {
      const sScores = selfScoresByRound.get(round.id) ?? []
      if (sScores.length > 0) {
        const avg = sScores.reduce((sum, s) => sum + LEVEL_VALUES[s.level as Level], 0) / sScores.length
        selfScore = Number(avg.toFixed(1))
      }
    }

    const mScores = mgrScoresByRound.get(round.id) ?? []
    const scoredKeys = new Set(mScores.map(s => s.skill_key))
    let managerScoringStatus: ManagerScoringStatus
    if (scoredKeys.size === 0) {
      managerScoringStatus = 'not_started'
    } else if (allSkillKeys.every(k => scoredKeys.has(k))) {
      managerScoringStatus = 'complete'
    } else {
      managerScoringStatus = 'in_progress'
    }

    const scoredPillarSet = new Set(
      [...scoredKeys]
        .map(key => PILLARS.find(p => getSkillsByPillar(p).some(s => s.key === key)))
        .filter((p): p is string => p !== undefined)
    )

    let managerScore: number | null = null
    if (managerScoringStatus === 'complete' && mScores.length > 0) {
      const avg = mScores.reduce((sum, s) => sum + LEVEL_VALUES[s.level as Level], 0) / mScores.length
      managerScore = Number(avg.toFixed(1))
    }

    const d = new Date(round.created_at)
    const quarter = Math.floor(d.getMonth() / 3) + 1
    const roundLabel = round.title ?? `Q${quarter} ${d.getFullYear()}`

    return {
      roundId: round.id,
      roundLabel,
      roundStatus: status,
      selfScore,
      managerScore,
      managerScoringStatus,
      pillarsScored: scoredPillarSet.size,
      completedAt: round.completed_at,
    }
  }

  const roundsByDR = new Map<string, typeof rounds>()
  for (const round of rounds as typeof rounds) {
    const bucket = roundsByDR.get(round.user_id) ?? []
    bucket.push(round)
    roundsByDR.set(round.user_id, bucket)
  }

  const summaries: TeamMemberSummary[] = Array.from(roundsByDR.entries()).map(([drId, drRounds]) => {
    const roundSummaries = drRounds.map(r => computeRoundSummary(r))
    const pendingScoringCount = roundSummaries.filter(r => r.managerScoringStatus !== 'complete').length
    return { directReportId: drId, rounds: roundSummaries, pendingScoringCount }
  })

  return summaries.sort((a, b) => {
    const pendingA = a.pendingScoringCount > 0 ? 0 : 1
    const pendingB = b.pendingScoringCount > 0 ? 0 : 1
    return pendingA - pendingB
  })
}
