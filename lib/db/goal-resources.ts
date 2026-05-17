import { createClient } from '@/lib/supabase/server'
import type { Resource } from './resources'

export interface GoalResource {
  id: string
  plan_id: string
  resource_id: string
  user_id: string
  created_at: string
  resource: Resource
}

export async function getGoalResources(planId: string): Promise<GoalResource[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('goal_resources')
    .select('*, resource:resources(*)')
    .eq('plan_id', planId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []) as GoalResource[]
}

export async function addGoalResource(
  planId: string,
  resourceId: string,
  userId: string
): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('goal_resources')
    .insert({ plan_id: planId, resource_id: resourceId, user_id: userId })
  if (error && error.code !== '23505') throw error // ignore duplicate
}

export async function removeGoalResource(planId: string, resourceId: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('goal_resources')
    .delete()
    .eq('plan_id', planId)
    .eq('resource_id', resourceId)
  if (error) throw error
}

export async function bulkAddGoalResources(
  planId: string,
  resourceIds: string[],
  userId: string
): Promise<void> {
  if (resourceIds.length === 0) return
  const supabase = await createClient()
  const { error } = await supabase.from('goal_resources').insert(
    resourceIds.map(resource_id => ({ plan_id: planId, resource_id, user_id: userId }))
  )
  if (error && error.code !== '23505') throw error
}
