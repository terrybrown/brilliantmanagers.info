// app/(app)/reflections/actions.ts
'use server'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createRound } from '@/lib/db/rounds'
import { createNotification } from '@/lib/notifications'

export async function createRoundAction(formData: FormData): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const title = (formData.get('title') as string) || 'Reflection'
  const notes = (formData.get('notes') as string) || null
  const remindAt = (formData.get('remind_at') as string) || null

  await createRound(user.id, title, notes, remindAt)
  redirect('/scorecard')
}

export async function scheduleRoundAction(
  userId: string,
  scheduledDate: string
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthenticated' }

  // Only the user themselves, or their active manager, may schedule a round
  if (user.id !== userId) {
    const { data: conn } = await supabase
      .from('connections')
      .select('id')
      .eq('manager_id', user.id)
      .eq('direct_report_id', userId)
      .eq('status', 'active')
      .maybeSingle()
    if (!conn) return { error: 'Forbidden' }
  }

  // Check for an existing scheduled round — if one exists, nothing to do
  const { data: existing } = await supabase
    .from('assessment_rounds')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'scheduled')
    .maybeSingle()

  if (existing) {
    // Already scheduled — nothing to do
    return {}
  }

  const { error } = await supabase
    .from('assessment_rounds')
    .insert({ user_id: userId, status: 'scheduled' })

  if (error) return { error: error.message }

  await createNotification(userId, 'round_scheduled', { scheduledDate })
  return {}
}
