'use server'
import { createClient } from '@/lib/supabase/server'
import { upsertScore } from '@/lib/db/scores'
import { maybeCompleteRound } from '@/lib/db/rounds'
import { logAudit } from '@/lib/audit'
import { getConnectionsForUser } from '@/lib/db/connections'
import { createNotification } from '@/lib/notifications'
import { sendManagerScoringNeededEmail } from '@/lib/email/notifications'
import type { Level } from '@/lib/skills'

export async function saveScore(
  roundId: string,
  pillar: string,
  skillKey: string,
  level: Level
): Promise<{ roundCompleted: boolean }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  await upsertScore(roundId, pillar, skillKey, level)
  const roundCompleted = await maybeCompleteRound(roundId)

  if (roundCompleted) {
    const { asDirectReport } = await getConnectionsForUser(user.id)
    const activeManagerConn = asDirectReport.find(c => c.status === 'active')
    if (activeManagerConn) {
      const managerId = activeManagerConn.manager_id

      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', user.id)
        .single()
      const displayName = profile?.display_name ?? user.email ?? 'Your direct report'

      await createNotification(managerId, 'manager_scoring_needed', {
        directReportId: user.id,
        directReportName: displayName,
        roundId,
      })
      void sendManagerScoringNeededEmail(managerId, displayName)
    }
  }

  await logAudit({
    actorId: user.id,
    action: 'scorecard.submit',
    entityType: 'score',
    entityId: roundId,
    metadata: { pillar, skillKey, level },
  })

  return { roundCompleted }
}
