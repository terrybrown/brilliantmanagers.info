import { createClient } from '@/lib/supabase/server'

export interface DevelopmentPlan {
  id: string
  user_id: string
  skill_key: string
  pillar: string
  goal: string
  target_date: string | null
  status: 'planned' | 'in_progress' | 'completed'
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

export async function upsertPlan(
  userId: string,
  plan: {
    skill_key: string
    pillar: string
    goal: string
    target_date?: string | null
    status: 'planned' | 'in_progress' | 'completed'
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
