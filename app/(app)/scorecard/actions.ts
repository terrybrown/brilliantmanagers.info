'use server'
import { createClient } from '@/lib/supabase/server'
import { upsertScore } from '@/lib/db/scores'
import { maybeCompleteRound } from '@/lib/db/rounds'
import { logAudit } from '@/lib/audit'
import type { Level } from '@/lib/skills'

export async function saveScore(
  roundId: string,
  pillar: string,
  skillKey: string,
  level: Level
): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  await upsertScore(roundId, pillar, skillKey, level)
  await maybeCompleteRound(roundId)

  if (user) {
    await logAudit({
      actorId: user.id,
      action: 'scorecard.submit',
      entityType: 'score',
      entityId: roundId,
      metadata: { pillar, skillKey, level },
    })
  }
}
