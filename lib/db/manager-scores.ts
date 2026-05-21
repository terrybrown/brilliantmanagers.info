import { createClient } from '@/lib/supabase/server'
import type { Level } from '@/lib/skills'

export interface ManagerScore {
  id: string
  round_id: string
  manager_id: string
  skill_key: string
  level: Level
  scored_at: string
}

export async function upsertManagerScore(
  roundId: string,
  managerId: string,
  skillKey: string,
  level: Level
): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase.from('manager_scores').upsert(
    {
      round_id: roundId,
      manager_id: managerId,
      skill_key: skillKey,
      level,
      scored_at: new Date().toISOString(),
    },
    { onConflict: 'round_id,manager_id,skill_key' }
  )
  if (error) throw error
}

export async function getManagerScoresForRound(
  roundId: string,
  managerId: string
): Promise<ManagerScore[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('manager_scores')
    .select('*')
    .eq('round_id', roundId)
    .eq('manager_id', managerId)
  if (error) throw error
  return (data ?? []) as ManagerScore[]
}

export async function getManagerScoresForDirectReport(
  roundId: string
): Promise<ManagerScore[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('manager_scores')
    .select('*')
    .eq('round_id', roundId)
  if (error) throw error
  return (data ?? []) as ManagerScore[]
}

export async function getManagerScoresForAllRounds(
  roundIds: string[]
): Promise<Record<string, ManagerScore[]>> {
  if (roundIds.length === 0) return {}
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('manager_scores')
    .select('*')
    .in('round_id', roundIds)
  if (error) throw error
  const result: Record<string, ManagerScore[]> = {}
  for (const score of (data ?? []) as ManagerScore[]) {
    const bucket = result[score.round_id] ?? []
    bucket.push(score)
    result[score.round_id] = bucket
  }
  return result
}
