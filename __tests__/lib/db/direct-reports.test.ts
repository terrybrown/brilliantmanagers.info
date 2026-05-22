import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Round } from '@/lib/db/rounds'
import type { ScheduledRound } from '@/lib/db/scheduled-rounds'

let mockInProgress: Round | null = null
let mockScheduled: ScheduledRound | null = null
let mockLastRound: { id: string; completed_at: string | null } | null = null
let mockScoreRows: { level: string }[] = []
let mockManagerScoreRows: { skill_key: string }[] = []

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

vi.mock('@/lib/db/rounds', () => ({
  getInProgressRound: vi.fn(() => Promise.resolve(mockInProgress)),
}))

vi.mock('@/lib/db/scheduled-rounds', () => ({
  getScheduledRound: vi.fn(() => Promise.resolve(mockScheduled)),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      from: (table: string) => {
        if (table === 'assessment_rounds') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            not: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn(() => Promise.resolve({ data: mockLastRound })),
          }
        }
        if (table === 'scores') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn(() => Promise.resolve({ data: mockScoreRows })),
          }
        }
        // manager_scores — supports chained .eq().eq() returning { data, error }
        const managerScoresChain = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          then: undefined as unknown,
        }
        // Make the chain thenable so the last awaited .eq() resolves
        Object.defineProperty(managerScoresChain, 'then', {
          get() {
            return (resolve: (v: unknown) => void) =>
              resolve({ data: mockManagerScoreRows, error: null })
          },
        })
        return managerScoresChain
      },
    })
  ),
}))

describe('getDirectReportRoundSummaries', () => {
  beforeEach(() => {
    mockInProgress = null
    mockScheduled = null
    mockLastRound = null
    mockScoreRows = []
    mockManagerScoreRows = []
    vi.clearAllMocks()
  })

  it('returns empty object for empty input', async () => {
    const { getDirectReportRoundSummaries } = await import('@/lib/db/direct-reports')
    expect(await getDirectReportRoundSummaries([], 'mgr1')).toEqual({})
  })

  it('returns in_progress status when round is in progress', async () => {
    mockInProgress = { id: 'r1', user_id: 'u1', status: 'in_progress', created_at: '', completed_at: null }
    const { getDirectReportRoundSummaries } = await import('@/lib/db/direct-reports')
    const result = await getDirectReportRoundSummaries(['u1'], 'mgr1')
    expect(result['u1'].roundStatus).toBe('in_progress')
  })

  it('returns scheduled status when no in-progress but scheduled exists', async () => {
    mockScheduled = { id: 's1', user_id: 'u1', scheduled_date: '2026-07-01', created_at: '', updated_at: '' }
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

  it('returns not_started managerScoringStatus when no in-progress round', async () => {
    const { getDirectReportRoundSummaries } = await import('@/lib/db/direct-reports')
    const result = await getDirectReportRoundSummaries(['u1'], 'mgr1')
    expect(result['u1'].managerScoringStatus).toBe('not_started')
    expect(result['u1'].roundId).toBeNull()
    expect(result['u1'].pillarsScored).toBe(0)
  })

  it('returns roundId from the in-progress round', async () => {
    mockInProgress = { id: 'r2', user_id: 'u1', status: 'in_progress', created_at: '', completed_at: null }
    const { getDirectReportRoundSummaries } = await import('@/lib/db/direct-reports')
    const result = await getDirectReportRoundSummaries(['u1'], 'mgr1')
    expect(result['u1'].roundId).toBe('r2')
  })

  it('returns managerScoringStatus: in_progress when only some skills are scored', async () => {
    mockInProgress = { id: 'round-1', user_id: 'u1', status: 'in_progress', created_at: '', completed_at: null }
    mockManagerScoreRows = [{ skill_key: 'sk1' }]
    const { getDirectReportRoundSummaries } = await import('@/lib/db/direct-reports')
    const result = await getDirectReportRoundSummaries(['u1'], 'manager-1')
    expect(result['u1'].managerScoringStatus).toBe('in_progress')
    expect(result['u1'].pillarsScored).toBe(1) // 'self' pillar has sk1 scored
  })

  it('returns managerScoringStatus: complete and pillarsScored: 2 when all skills scored', async () => {
    mockInProgress = { id: 'round-1', user_id: 'u1', status: 'in_progress', created_at: '', completed_at: null }
    mockManagerScoreRows = [{ skill_key: 'sk1' }, { skill_key: 'sk2' }, { skill_key: 'sk3' }]
    const { getDirectReportRoundSummaries } = await import('@/lib/db/direct-reports')
    const result = await getDirectReportRoundSummaries(['u1'], 'manager-1')
    expect(result['u1'].managerScoringStatus).toBe('complete')
    expect(result['u1'].pillarsScored).toBe(2) // both 'self' and 'team' pillars covered
  })
})
