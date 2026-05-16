import { createClient } from '@/lib/supabase/server'
import { PILLARS } from '@/lib/skills'

export interface Round {
  id: string
  user_id: string
  status: 'in_progress' | 'complete'
  created_at: string
  completed_at: string | null
}

export async function getOrCreateActiveRound(userId: string): Promise<Round> {
  const supabase = await createClient()

  const { data: existing } = await supabase
    .from('assessment_rounds')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'in_progress')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existing) return existing as Round

  const { data, error } = await supabase
    .from('assessment_rounds')
    .insert({ user_id: userId, status: 'in_progress' })
    .select()
    .single()

  if (error) throw error
  return data as Round
}

export async function getLatestCompleteRound(userId: string): Promise<Round | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('assessment_rounds')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'complete')
    .order('completed_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data as Round | null
}

export async function maybeCompleteRound(roundId: string): Promise<void> {
  const supabase = await createClient()
  const { data: scores } = await supabase
    .from('scores')
    .select('pillar')
    .eq('round_id', roundId)

  const scoredPillars = new Set((scores ?? []).map((s: { pillar: string }) => s.pillar))
  if (PILLARS.every(p => scoredPillars.has(p))) {
    await supabase
      .from('assessment_rounds')
      .update({ status: 'complete', completed_at: new Date().toISOString() })
      .eq('id', roundId)
  }
}
