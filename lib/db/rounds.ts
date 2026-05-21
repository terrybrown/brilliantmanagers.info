import { createClient } from '@/lib/supabase/server'
import { PILLARS } from '@/lib/skills'
import type { Score } from '@/lib/db/scores'

export interface Round {
  id: string
  user_id: string
  status: 'in_progress' | 'complete'
  created_at: string
  completed_at: string | null
  title: string | null
  notes: string | null
  remind_at: string | null
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

export async function maybeCompleteRound(roundId: string): Promise<boolean> {
  const supabase = await createClient()
  const { data: scores } = await supabase
    .from('scores')
    .select('pillar')
    .eq('round_id', roundId)

  const scoredPillars = new Set((scores ?? []).map((s: { pillar: string }) => s.pillar))
  if (PILLARS.every(p => scoredPillars.has(p))) {
    const { error } = await supabase
      .from('assessment_rounds')
      .update({ status: 'complete', completed_at: new Date().toISOString() })
      .eq('id', roundId)
    if (error) throw error
    return true
  }
  return false
}

export async function getInProgressRound(userId: string): Promise<Round | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('assessment_rounds')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'in_progress')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data as Round | null
}

export async function getPreviousCompleteRound(
  userId: string,
  beforeCompletedAt: string
): Promise<Round | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('assessment_rounds')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'complete')
    .lt('completed_at', beforeCompletedAt)
    .order('completed_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data as Round | null
}

export async function getAllCompleteRoundsWithScores(
  userId: string
): Promise<{ round: Round; scores: Score[] }[]> {
  const supabase = await createClient()

  const { data: rounds, error: roundsError } = await supabase
    .from('assessment_rounds')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'complete')
    .not('completed_at', 'is', null)
    .order('completed_at', { ascending: true })
  if (roundsError) throw roundsError

  if (!rounds || rounds.length === 0) return []

  const roundIds = (rounds as Round[]).map(r => r.id)

  const { data: allScores, error: scoresError } = await supabase
    .from('scores')
    .select('*')
    .in('round_id', roundIds)
  if (scoresError) throw scoresError

  const scoresByRound = new Map<string, Score[]>()
  for (const score of (allScores ?? []) as Score[]) {
    const bucket = scoresByRound.get(score.round_id) ?? []
    bucket.push(score)
    scoresByRound.set(score.round_id, bucket)
  }

  return (rounds as Round[]).map(round => ({
    round,
    scores: scoresByRound.get(round.id) ?? [],
  }))
}

export async function createRound(
  userId: string,
  title: string,
  notes: string | null,
  remindAt: string | null
): Promise<Round> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('assessment_rounds')
    .insert({ user_id: userId, status: 'in_progress', title, notes, remind_at: remindAt })
    .select()
    .single()
  if (error) throw error
  return data as Round
}

export async function getRoundById(roundId: string, userId: string): Promise<Round | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('assessment_rounds')
    .select('*')
    .eq('id', roundId)
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  return data as Round | null
}
