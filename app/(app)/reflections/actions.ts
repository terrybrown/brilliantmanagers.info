'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createRound } from '@/lib/db/rounds'
import { createNotification } from '@/lib/notifications'
import { ok, err, type ActionResult } from '@/lib/action-result'

export async function createRoundAction(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return err('Not authenticated')

  const title = (formData.get('title') as string) || 'Reflection'
  const notes = (formData.get('notes') as string) || null
  const remindAt = (formData.get('remind_at') as string) || null

  try {
    await createRound(user.id, title, notes, remindAt)
  } catch {
    return err('Failed to create round. Please try again.')
  }

  redirect('/scorecard')
}

export async function scheduleRoundAction(
  userId: string,
  scheduledDate: string
): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return err('Not authenticated')

  if (user.id !== userId) {
    const { data: conn } = await supabase
      .from('connections')
      .select('id')
      .eq('manager_id', user.id)
      .eq('direct_report_id', userId)
      .eq('status', 'active')
      .maybeSingle()
    if (!conn) return err('Forbidden')
  }

  const { data: existing } = await supabase
    .from('assessment_rounds')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'scheduled')
    .maybeSingle()

  if (existing) return ok()

  const { error } = await supabase
    .from('assessment_rounds')
    .insert({ user_id: userId, status: 'scheduled' })

  if (error) return err(error.message)

  await createNotification(userId, 'round_scheduled', { scheduledDate })
  return ok()
}
