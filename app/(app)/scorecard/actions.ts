'use server'
import { upsertScore } from '@/lib/db/scores'
import { maybeCompleteRound } from '@/lib/db/rounds'
import type { Level } from '@/lib/skills'
import { getSkillGuideContent } from '@/lib/guide-content'
import type { SkillGuideContent } from '@/lib/guide-content'

export async function saveScore(
  roundId: string,
  pillar: string,
  skillKey: string,
  level: Level
): Promise<void> {
  await upsertScore(roundId, pillar, skillKey, level)
  await maybeCompleteRound(roundId)
}

export async function getGuideContent(skillKey: string): Promise<SkillGuideContent | null> {
  return getSkillGuideContent(skillKey)
}
