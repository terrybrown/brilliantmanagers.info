import { createClient } from '@/lib/supabase/server'
import { getInProgressRound } from '@/lib/db/rounds'
import { getScheduledRound } from '@/lib/db/scheduled-rounds'
import { LEVEL_VALUES } from '@/lib/skills'
import type { Level } from '@/lib/skills'

export interface DirectReportRoundSummary {
  roundStatus: 'in_progress' | 'scheduled' | 'none'
  lastScore: number | null
  nextScheduledDate: string | null
  managerHasScored: boolean
}

export async function getDirectReportRoundSummaries(
  directReportIds: string[]
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
        .select('id')
        .eq('user_id', userId)
        .eq('status', 'complete')
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false })
        .limit(1)
        .maybeSingle()

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

      // Manager has scored the in-progress round
      let managerHasScored = false
      if (inProgress) {
        const { count } = await supabase
          .from('manager_scores')
          .select('*', { count: 'exact', head: true })
          .eq('round_id', inProgress.id)
        managerHasScored = (count ?? 0) > 0
      }

      return [userId, {
        roundStatus,
        lastScore,
        nextScheduledDate: scheduled?.scheduled_date ?? null,
        managerHasScored,
      }] as [string, DirectReportRoundSummary]
    })
  )

  return Object.fromEntries(entries)
}
