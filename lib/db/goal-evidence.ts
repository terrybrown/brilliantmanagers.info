import { createClient } from '@/lib/supabase/server'

export interface GoalEvidence {
  id: string
  plan_id: string
  user_id: string
  what_you_did: string
  impact: string
  url: string | null
  created_at: string
}

export async function getEvidenceForPlan(planId: string): Promise<GoalEvidence[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('goal_evidence')
    .select('*')
    .eq('plan_id', planId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as GoalEvidence[]
}

export async function addEvidence(
  planId: string,
  userId: string,
  entry: { what_you_did: string; impact: string; url?: string | null }
): Promise<GoalEvidence> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('goal_evidence')
    .insert({ plan_id: planId, user_id: userId, ...entry })
    .select()
    .single()
  if (error) throw error
  return data as GoalEvidence
}
