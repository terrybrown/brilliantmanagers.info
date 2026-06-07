import { describe, it, expect } from 'vitest'
import { buildGuideUserData } from '@/lib/db/guide-data'
import type { SkillItem } from '@/lib/mdx'

const CHAPTER_SKILLS: SkillItem[] = [
  { id: 'time-and-task-management', text: 'Time and Task Management', skillKey: 'self-time-task-management' },
  { id: 'empathy-and-compassion', text: 'Empathy and Compassion', skillKey: 'self-empathy-compassion' },
  { id: 'growth-mindset', text: 'Growth Mindset', skillKey: 'self-growth-mindset' },
]

describe('buildGuideUserData', () => {
  it('returns null pillarScore when no scores provided', () => {
    const result = buildGuideUserData(CHAPTER_SKILLS, [], [])
    expect(result.pillarScore).toBeNull()
  })

  it('computes correct pillarScore average (Developing=1, Basic=2, Proficient=3 → 2.0)', () => {
    const scores = [
      { skill_key: 'self-time-task-management', level: 'Developing' },
      { skill_key: 'self-empathy-compassion', level: 'Basic' },
      { skill_key: 'self-growth-mindset', level: 'Proficient' },
    ]
    expect(buildGuideUserData(CHAPTER_SKILLS, scores, []).pillarScore).toBe(2)
  })

  it('rounds pillarScore to 1 decimal (Advanced=4, Expert=5 → 4.5)', () => {
    const scores = [
      { skill_key: 'self-time-task-management', level: 'Advanced' },
      { skill_key: 'self-empathy-compassion', level: 'Expert' },
    ]
    expect(buildGuideUserData(CHAPTER_SKILLS, scores, []).pillarScore).toBe(4.5)
  })

  it('maps level correctly to skillDataBySlug by guide slug key', () => {
    const scores = [{ skill_key: 'self-time-task-management', level: 'Advanced' }]
    const result = buildGuideUserData(CHAPTER_SKILLS, scores, [])
    expect(result.skillDataBySlug['time-and-task-management']?.level).toBe('Advanced')
  })

  it('marks hasGoal true and records planId when active plan exists', () => {
    const plans = [{ id: 'plan-abc', skill_key: 'self-growth-mindset', status: 'in_progress' }]
    const result = buildGuideUserData(CHAPTER_SKILLS, [], plans)
    expect(result.skillDataBySlug['growth-mindset']?.hasGoal).toBe(true)
    expect(result.skillDataBySlug['growth-mindset']?.planId).toBe('plan-abc')
  })

  it('marks hasGoal false when no plan for skill', () => {
    const result = buildGuideUserData(CHAPTER_SKILLS, [], [])
    expect(result.skillDataBySlug['time-and-task-management']?.hasGoal).toBe(false)
  })

  it('sets level null for unscored skills', () => {
    const result = buildGuideUserData(CHAPTER_SKILLS, [], [])
    expect(result.skillDataBySlug['time-and-task-management']?.level).toBeNull()
  })

  it('ignores skills with no skillKey', () => {
    const skillsWithUnmatched: SkillItem[] = [
      ...CHAPTER_SKILLS,
      { id: 'unknown', text: 'Unknown', skillKey: undefined },
    ]
    const result = buildGuideUserData(skillsWithUnmatched, [], [])
    expect(result.skillDataBySlug['unknown']).toBeUndefined()
  })
})
