import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('@/lib/skills', () => ({
  PILLARS: ['self', 'team'],
  getSkillsByPillar: (p: string) =>
    p === 'self'
      ? [{ key: 'self-awareness' }, { key: 'self-regulation' }]
      : [{ key: 'team-building' }],
  LEVEL_VALUES: { exceptional: 5, strong: 4, developing: 3, needs_improvement: 2, unacceptable: 1 },
}))

import { createClient } from '@/lib/supabase/server'
import { getManagerScoringStatus } from '@/lib/db/manager-scores'

const mockCreateClient = vi.mocked(createClient)
beforeEach(() => vi.clearAllMocks())

function mockManagerScores(scores: { skill_key: string }[]) {
  mockCreateClient.mockResolvedValue({
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: scores, error: null }),
        }),
      }),
    }),
  } as never)
}

describe('getManagerScoringStatus', () => {
  it('returns not_started when no scores', async () => {
    mockManagerScores([])
    expect(await getManagerScoringStatus('r1', 'm1')).toBe('not_started')
  })

  it('returns complete when all 3 skills are scored', async () => {
    mockManagerScores([
      { skill_key: 'self-awareness' },
      { skill_key: 'self-regulation' },
      { skill_key: 'team-building' },
    ])
    expect(await getManagerScoringStatus('r1', 'm1')).toBe('complete')
  })

  it('returns in_progress when only some skills are scored', async () => {
    mockManagerScores([{ skill_key: 'self-awareness' }])
    expect(await getManagerScoringStatus('r1', 'm1')).toBe('in_progress')
  })
})
