'use server'

import { createClient } from '@/lib/supabase/server'
import { markAllRead } from '@/lib/notifications'
import { ok, err, type ActionResult } from '@/lib/action-result'

export async function markAllReadAction(): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return err('Not authenticated')
  try {
    await markAllRead(user.id)
  } catch {
    return err('Failed to mark notifications as read.')
  }
  return ok()
}
