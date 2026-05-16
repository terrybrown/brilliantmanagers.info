import { createClient } from '@/lib/supabase/server'
import type { Level } from '@/lib/skills'

export interface Score {
  id: string
  round_id: string
  pillar: string
  skill_key: string
  level: Level
  scored_at: string
}

export async function upsertScore(
  roundId: string,
  pillar: string,
  skillKey: string,
  level: Level
): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase.from('scores').upsert(
    {
      round_id: roundId,
      pillar,
      skill_key: skillKey,
      level,
      scored_at: new Date().toISOString(),
    },
    { onConflict: 'round_id,skill_key' }
  )
  if (error) throw error
}

export async function getScoresForRound(roundId: string): Promise<Score[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('scores')
    .select('*')
    .eq('round_id', roundId)
  if (error) throw error
  return (data ?? []) as Score[]
}
