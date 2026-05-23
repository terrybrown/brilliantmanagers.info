import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/skills', () => ({
  PILLARS: ['self', 'team'],
  getSkillsByPillar: (p: string) =>
    p === 'self'
      ? [{ key: 'sk1' }, { key: 'sk2' }]
      : [{ key: 'sk3' }],
  LEVEL_VALUES: {
    Developing: 1,
    Basic: 2,
    Proficient: 3,
    Advanced: 4,
    Expert: 5,
  },
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}))

import { createAdminClient } from '@/lib/supabase/admin'
const adminMock = createAdminClient as ReturnType<typeof vi.fn>

let mockInProgress: { id: string } | null = null
let mockScheduled: { scheduled_date: string } | null = null
let mockLastRound: { id: string; completed_at: string | null } | null = null
let mockScoreRows: { level: string }[] = []
let mockManagerScoreRows: { skill_key: string }[] = []

describe('getDirectReportRoundSummaries', () => {
  beforeEach(() => {
    mockInProgress = null
    mockScheduled = null
    mockLastRound = null
    mockScoreRows = []
    mockManagerScoreRows = []
    vi.clearAllMocks()

    // assessment_rounds is queried twice per DR:
    //   odd call  → in-progress round query
    //   even call → last complete round query
    let assessmentRoundsCallCount = 0

    function makeAssessmentChain(getResult: () => unknown) {
      const chain: Record<string, unknown> = {}
      const passthrough = vi.fn().mockReturnValue(chain)
      chain.select = passthrough
      chain.eq = passthrough
      chain.not = passthrough
      chain.order = passthrough
      chain.limit = passthrough
      chain.maybeSingle = vi.fn(() => Promise.resolve(getResult()))
      return chain
    }

    adminMock.mockReturnValue({
      from: (table: string) => {
        if (table === 'assessment_rounds') {
          assessmentRoundsCallCount++
          return assessmentRoundsCallCount % 2 === 1
            ? makeAssessmentChain(() => ({ data: mockInProgress }))
            : makeAssessmentChain(() => ({ data: mockLastRound }))
        }
        if (table === 'scheduled_rounds') {
          const chain: Record<string, unknown> = {}
          const passthrough = vi.fn().mockReturnValue(chain)
          chain.select = passthrough
          chain.eq = passthrough
          chain.maybeSingle = vi.fn(() => Promise.resolve({ data: mockScheduled }))
          return chain
        }
        if (table === 'scores') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn(() => Promise.resolve({ data: mockScoreRows })),
          }
        }
        // manager_scores — chain is awaitable at the last .eq()
        const mgChain = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          then: undefined as unknown,
        }
        Object.defineProperty(mgChain, 'then', {
          get() {
            return (resolve: (v: unknown) => void) =>
              resolve({ data: mockManagerScoreRows, error: null })
          },
        })
        return mgChain
      },
    })
  })

  it('returns empty object for empty input', async () => {
    const { getDirectReportRoundSummaries } = await import('@/lib/db/direct-reports')
    expect(await getDirectReportRoundSummaries([], 'mgr1')).toEqual({})
  })

  it('returns in_progress status when round is in progress', async () => {
    mockInProgress = { id: 'r1' }
    const { getDirectReportRoundSummaries } = await import('@/lib/db/direct-reports')
    const result = await getDirectReportRoundSummaries(['u1'], 'mgr1')
    expect(result['u1'].roundStatus).toBe('in_progress')
  })

  it('returns scheduled status when no in-progress but scheduled exists', async () => {
    mockScheduled = { scheduled_date: '2026-07-01' }
    const { getDirectReportRoundSummaries } = await import('@/lib/db/direct-reports')
    const result = await getDirectReportRoundSummaries(['u1'], 'mgr1')
    expect(result['u1'].roundStatus).toBe('scheduled')
    expect(result['u1'].nextScheduledDate).toBe('2026-07-01')
  })

  it('returns null lastScore when no complete rounds', async () => {
    const { getDirectReportRoundSummaries } = await import('@/lib/db/direct-reports')
    const result = await getDirectReportRoundSummaries(['u1'], 'mgr1')
    expect(result['u1'].lastScore).toBeNull()
  })

  it('computes lastScore as average of LEVEL_VALUES', async () => {
    mockLastRound = { id: 'r1', completed_at: '2026-05-01T00:00:00Z' }
    mockScoreRows = [{ level: 'Proficient' }, { level: 'Advanced' }] // 3 + 4 → avg 3.5
    const { getDirectReportRoundSummaries } = await import('@/lib/db/direct-reports')
    const result = await getDirectReportRoundSummaries(['u1'], 'mgr1')
    expect(result['u1'].lastScore).toBe(3.5)
  })

  it('exposes completedAt from the last complete round', async () => {
    mockLastRound = { id: 'r1', completed_at: '2026-04-15T00:00:00Z' }
    const { getDirectReportRoundSummaries } = await import('@/lib/db/direct-reports')
    const result = await getDirectReportRoundSummaries(['u1'], 'mgr1')
    expect(result['u1'].completedAt).toBe('2026-04-15T00:00:00Z')
  })

  it('returns not_started managerScoringStatus when no roundId', async () => {
    const { getDirectReportRoundSummaries } = await import('@/lib/db/direct-reports')
    const result = await getDirectReportRoundSummaries(['u1'], 'mgr1')
    expect(result['u1'].managerScoringStatus).toBe('not_started')
    expect(result['u1'].roundId).toBeNull()
    expect(result['u1'].pillarsScored).toBe(0)
  })

  it('returns roundId from the in-progress round when no complete round exists', async () => {
    mockInProgress = { id: 'r2' }
    const { getDirectReportRoundSummaries } = await import('@/lib/db/direct-reports')
    const result = await getDirectReportRoundSummaries(['u1'], 'mgr1')
    expect(result['u1'].roundId).toBe('r2')
  })

  it('prefers the complete round id over the in-progress round id', async () => {
    mockInProgress = { id: 'in-progress-id' }
    mockLastRound = { id: 'complete-id', completed_at: '2026-04-15T00:00:00Z' }
    const { getDirectReportRoundSummaries } = await import('@/lib/db/direct-reports')
    const result = await getDirectReportRoundSummaries(['u1'], 'mgr1')
    expect(result['u1'].roundId).toBe('complete-id')
  })

  it('returns managerScoringStatus: in_progress when only some skills are scored', async () => {
    mockInProgress = { id: 'round-1' }
    mockManagerScoreRows = [{ skill_key: 'sk1' }]
    const { getDirectReportRoundSummaries } = await import('@/lib/db/direct-reports')
    const result = await getDirectReportRoundSummaries(['u1'], 'manager-1')
    expect(result['u1'].managerScoringStatus).toBe('in_progress')
    expect(result['u1'].pillarsScored).toBe(1) // 'self' pillar has sk1 scored
  })

  it('returns managerScoringStatus: complete and pillarsScored: 2 when all skills scored', async () => {
    mockInProgress = { id: 'round-1' }
    mockManagerScoreRows = [{ skill_key: 'sk1' }, { skill_key: 'sk2' }, { skill_key: 'sk3' }]
    const { getDirectReportRoundSummaries } = await import('@/lib/db/direct-reports')
    const result = await getDirectReportRoundSummaries(['u1'], 'manager-1')
    expect(result['u1'].managerScoringStatus).toBe('complete')
    expect(result['u1'].pillarsScored).toBe(2) // both 'self' and 'team' pillars covered
  })
})
