import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getInProgressRound } from '@/lib/db/rounds'
import { getScheduledRound } from '@/lib/db/scheduled-rounds'
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

  const supabase = await createClient()

  const entries = await Promise.all(
    directReportIds.map(async (userId) => {
      const [inProgress, scheduled] = await Promise.all([
        getInProgressRound(userId),
        getScheduledRound(userId),
      ])

      const roundStatus: DirectReportRoundSummary['roundStatus'] =
        inProgress ? 'in_progress' : scheduled ? 'scheduled' : 'none'

      // Most recent complete round
      const { data: lastRound } = await supabase
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
        const { data: scoreRows } = await supabase
          .from('scores')
          .select('level')
          .eq('round_id', lastRound.id)
        const levels = (scoreRows ?? []) as { level: Level }[]
        if (levels.length > 0) {
          const avg = levels.reduce((sum, s) => sum + LEVEL_VALUES[s.level], 0) / levels.length
          lastScore = Number(avg.toFixed(1))
        }
      }

      const activeRound = inProgress
      const roundId = activeRound?.id ?? null

      let managerScoringStatus: ManagerScoringStatus = 'not_started'
      let pillarsScored = 0

      if (roundId) {
        const { data: mgrScores, error: mgrScoresError } = await supabase
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

export interface TeamReflectionSummary {
  directReportId: string
  roundId: string
  roundStatus: 'in_progress' | 'complete' | 'scheduled'
  managerScoringStatus: ManagerScoringStatus
  selfCompletedAt: string | null
}

export async function getTeamReflectionSummaries(
  directReportIds: string[],
  managerId: string
): Promise<TeamReflectionSummary[]> {
  if (directReportIds.length === 0) return []

  const supabase = createAdminClient()
  const { data: rounds } = await supabase
    .from('assessment_rounds')
    .select('id, user_id, status, created_at, completed_at')
    .in('user_id', directReportIds)
    .order('created_at', { ascending: false })

  if (!rounds?.length) return []

  // Keep only the latest round per DR (rows already sorted desc by created_at)
  const latestByDR = new Map<string, typeof rounds[0]>()
  for (const round of rounds) {
    if (!latestByDR.has(round.user_id)) latestByDR.set(round.user_id, round)
  }

  const summaries: TeamReflectionSummary[] = await Promise.all(
    Array.from(latestByDR.entries()).map(async ([drId, round]) => {
      const managerScoringStatus = await getManagerScoringStatus(round.id, managerId)
      return {
        directReportId: drId,
        roundId: round.id,
        roundStatus: round.status as TeamReflectionSummary['roundStatus'],
        managerScoringStatus,
        selfCompletedAt: round.completed_at,
      }
    })
  )

  // Pending scoring first, then completed
  return summaries.sort((a, b) => {
    const pendingA = a.managerScoringStatus !== 'complete' ? 0 : 1
    const pendingB = b.managerScoringStatus !== 'complete' ? 0 : 1
    if (pendingA !== pendingB) return pendingA - pendingB
    // Secondary: oldest completed first (nulls last)
    if (!a.selfCompletedAt && !b.selfCompletedAt) return 0
    if (!a.selfCompletedAt) return 1
    if (!b.selfCompletedAt) return -1
    return a.selfCompletedAt.localeCompare(b.selfCompletedAt)
  })
}
