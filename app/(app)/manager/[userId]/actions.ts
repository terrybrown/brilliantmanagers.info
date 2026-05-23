'use server'

import { createClient } from '@/lib/supabase/server'
import { upsertManagerScore } from '@/lib/db/manager-scores'
import { logAudit } from '@/lib/audit'
import { ok, err, type ActionResult } from '@/lib/action-result'
import type { Level } from '@/lib/skills'

export async function saveManagerScore(
  roundId: string,
  pillar: string,
  skillKey: string,
  level: Level
): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return err('Not authenticated')

  try {
    await upsertManagerScore(roundId, user.id, skillKey, level)
    await logAudit({
      actorId: user.id,
      action: 'manager_score.submit',
      entityType: 'manager_score',
      entityId: roundId,
      metadata: { pillar, skillKey, level },
    })
  } catch {
    return err('Failed to save score. Please try again.')
  }
  return ok()
}
