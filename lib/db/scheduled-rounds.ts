import { createClient } from '@/lib/supabase/server'

export interface ScheduledRound {
  id: string
  user_id: string
  scheduled_date: string
  created_at: string
  updated_at: string
}

export async function getScheduledRound(userId: string): Promise<ScheduledRound | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('scheduled_rounds')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()
  return data ?? null
}

export async function upsertScheduledRound(userId: string, date: string): Promise<ScheduledRound> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('scheduled_rounds')
    .upsert(
      { user_id: userId, scheduled_date: date, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    )
    .select()
    .single()
  if (error) throw error
  return data as ScheduledRound
}

export async function deleteScheduledRound(userId: string): Promise<void> {
  const supabase = await createClient()
  await supabase.from('scheduled_rounds').delete().eq('user_id', userId)
}
