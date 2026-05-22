import { createClient } from '@/lib/supabase/server'
import { getInProgressRound } from '@/lib/db/rounds'
import { getScheduledRound } from '@/lib/db/scheduled-rounds'
import { LEVEL_VALUES, PILLARS, getSkillsByPillar } from '@/lib/skills'
import type { Level } from '@/lib/skills'
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
        managerScoringStatus = await getManagerScoringStatus(roundId, managerId)

        const { data: mgrScores } = await supabase
          .from('manager_scores')
          .select('skill_key')
          .eq('round_id', roundId)
          .eq('manager_id', managerId)

        const scoredPillars = new Set(
          (mgrScores ?? [])
            .map(s =>
              PILLARS.find(p => getSkillsByPillar(p).some(sk => sk.key === s.skill_key))
            )
            .filter(Boolean)
        )
        pillarsScored = scoredPillars.size
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
