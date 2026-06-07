import { createClient } from '@/lib/supabase/server'
import { LEVEL_VALUES } from '@/lib/skills'
import type { Level } from '@/lib/skills'
import type { SkillItem } from '@/lib/mdx'

export interface SkillGuideData {
  level: Level | null
  hasGoal: boolean
  planId?: string
}

export interface GuideUserData {
  pillarScore: number | null
  skillDataBySlug: Record<string, SkillGuideData>
}

interface RawScore {
  skill_key: string
  level: string
}

interface RawPlan {
  id: string
  skill_key: string
  status: string
}

/** Pure computation — separated for unit testing. */
export function buildGuideUserData(
  skills: SkillItem[],
  scores: RawScore[],
  plans: RawPlan[]
): GuideUserData {
  const scoreByKey: Record<string, Level> = {}
  for (const s of scores) {
    scoreByKey[s.skill_key] = s.level as Level
  }

  const planByKey: Record<string, RawPlan> = {}
  for (const p of plans) {
    planByKey[p.skill_key] = p
  }

  const skillDataBySlug: Record<string, SkillGuideData> = {}
  let total = 0
  let count = 0

  for (const skill of skills) {
    if (!skill.skillKey) continue
    const level = scoreByKey[skill.skillKey] ?? null
    const plan = planByKey[skill.skillKey]
    skillDataBySlug[skill.id] = {
      level,
      hasGoal: !!plan,
      planId: plan?.id,
    }
    if (level) {
      total += LEVEL_VALUES[level]
      count++
    }
  }

  const pillarScore =
    count > 0 ? Math.round((total / count) * 10) / 10 : null

  return { pillarScore, skillDataBySlug }
}

/** Fetches score + goal data for the authenticated user's current guide view. */
export async function fetchGuideUserData(
  userId: string,
  skills: SkillItem[]
): Promise<GuideUserData> {
  const skillKeys = skills.flatMap((s) => (s.skillKey ? [s.skillKey] : []))
  if (skillKeys.length === 0) {
    return { pillarScore: null, skillDataBySlug: {} }
  }

  const supabase = await createClient()

  // Most recent complete round
  const { data: round } = await supabase
    .from('assessment_rounds')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'complete')
    .not('completed_at', 'is', null)
    .order('completed_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const scores: RawScore[] = []
  if (round) {
    const { data } = await supabase
      .from('scores')
      .select('skill_key, level')
      .eq('round_id', round.id)
      .in('skill_key', skillKeys)
    scores.push(...(data ?? []))
  }

  const { data: plans } = await supabase
    .from('development_plans')
    .select('id, skill_key, status')
    .eq('user_id', userId)
    .in('skill_key', skillKeys)
    .in('status', ['planned', 'in_progress'])

  return buildGuideUserData(skills, scores, plans ?? [])
}
