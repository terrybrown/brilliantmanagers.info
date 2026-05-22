import { createClient } from '@/lib/supabase/server'
import type { Level } from '@/lib/skills'
import { PILLARS, getSkillsByPillar } from '@/lib/skills'

export type ManagerScoringStatus = 'not_started' | 'in_progress' | 'complete'

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

  // Only reveal manager scores once the direct report's round is complete
  const { data: round, error: roundError } = await supabase
    .from('assessment_rounds')
    .select('status')
    .eq('id', roundId)
    .single()
  if (roundError) throw roundError
  if (!round || round.status !== 'complete') return []

  const { data, error } = await supabase
    .from('manager_scores')
    .select('*')
    .eq('round_id', roundId)
  if (error) throw error
  return (data ?? []) as ManagerScore[]
}

export async function getManagerScoringStatus(
  roundId: string,
  managerId: string
): Promise<ManagerScoringStatus> {
  const supabase = await createClient()
  const { data: scores, error } = await supabase
    .from('manager_scores')
    .select('skill_key')
    .eq('round_id', roundId)
    .eq('manager_id', managerId)

  if (error) throw error

  const scored = new Set((scores ?? []).map(s => s.skill_key))
  if (scored.size === 0) return 'not_started'

  const allKeys = PILLARS.flatMap(p => getSkillsByPillar(p).map(s => s.key))
  return allKeys.every(k => scored.has(k)) ? 'complete' : 'in_progress'
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
