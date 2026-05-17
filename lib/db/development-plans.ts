import { createClient } from '@/lib/supabase/server'

export interface DevelopmentPlan {
  id: string
  user_id: string
  skill_key: string
  pillar: string
  goal: string
  target_date: string | null
  status: 'planned' | 'in_progress' | 'completed'
  checkin_frequency_weeks: number | null
  last_checkin_at: string | null
  created_at: string
  updated_at: string
}

export async function getPlansForUser(userId: string): Promise<DevelopmentPlan[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('development_plans')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as DevelopmentPlan[]
}

export async function getPlanById(id: string): Promise<DevelopmentPlan | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('development_plans')
    .select('*')
    .eq('id', id)
    .single()
  if (error) return null
  return data as DevelopmentPlan
}

export async function upsertPlan(
  userId: string,
  plan: {
    skill_key: string
    pillar: string
    goal: string
    target_date?: string | null
    status: 'planned' | 'in_progress' | 'completed'
    checkin_frequency_weeks?: number | null
  }
): Promise<DevelopmentPlan> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('development_plans')
    .upsert(
      { user_id: userId, ...plan, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,skill_key' }
    )
    .select()
    .single()
  if (error) throw error
  return data as DevelopmentPlan
}

export async function markPlanComplete(id: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('development_plans')
    .update({ status: 'completed', updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function updateLastCheckin(id: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('development_plans')
    .update({ last_checkin_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}
