import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockAdminFrom = vi.hoisted(() => vi.fn())

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}))
vi.mock('@/lib/skills', () => ({
  PILLARS: ['self', 'team'],
  getSkillsByPillar: (p: string) =>
    p === 'self' ? [{ key: 'sk1' }] : [{ key: 'sk2' }],
  LEVEL_VALUES: { Developing: 1, Approaching: 2, Meeting: 3, Exceeding: 4, Leading: 5 },
}))

beforeEach(() => vi.resetAllMocks())

import { getTeamReflectionSummaries } from '@/lib/db/direct-reports'

// Helper to build a mock Supabase chain returning { data, error }
// The terminal mock function is placed at every method that can be the last call
// in a chain (order, eq at leaf position, in at leaf position).
function mockChain(data: unknown[], error: null | Error = null) {
  const terminal = vi.fn().mockResolvedValue({ data, error })
  return {
    select: vi.fn().mockReturnValue({
      in: vi.fn().mockReturnValue({
        order: terminal,
        eq: terminal,
      }),
      eq: vi.fn().mockReturnValue({
        in: terminal,
      }),
    }),
  }
}

describe('getTeamReflectionSummaries', () => {
  it('returns empty array when no direct report IDs provided', async () => {
    expect(await getTeamReflectionSummaries([], 'mgr-1')).toEqual([])
  })

  it('returns empty array when no rounds found', async () => {
    mockAdminFrom.mockReturnValue(mockChain([]))
    expect(await getTeamReflectionSummaries(['dr-1'], 'mgr-1')).toEqual([])
  })

  it('groups rounds by DR and returns TeamMemberSummary', async () => {
    const rounds = [
      { id: 'r1', user_id: 'dr-1', status: 'complete', title: null, created_at: '2026-05-20T00:00:00Z', completed_at: '2026-05-20T12:00:00Z' },
      { id: 'r2', user_id: 'dr-1', status: 'in_progress', title: null, created_at: '2026-05-22T00:00:00Z', completed_at: null },
    ]
    mockAdminFrom
      .mockReturnValueOnce(mockChain(rounds))
      .mockReturnValueOnce(mockChain([]))
      .mockReturnValueOnce(mockChain([]))

    const result = await getTeamReflectionSummaries(['dr-1'], 'mgr-1')
    expect(result).toHaveLength(1)
    expect(result[0].directReportId).toBe('dr-1')
    expect(result[0].rounds).toHaveLength(2)
  })

  it('computes selfScore as average level value for complete rounds', async () => {
    const rounds = [
      { id: 'r1', user_id: 'dr-1', status: 'complete', title: null, created_at: '2026-05-20T00:00:00Z', completed_at: '2026-05-20T12:00:00Z' },
    ]
    const scores = [
      { round_id: 'r1', level: 'Approaching' },
      { round_id: 'r1', level: 'Meeting' },
    ]
    mockAdminFrom
      .mockReturnValueOnce(mockChain(rounds))
      .mockReturnValueOnce(mockChain(scores))
      .mockReturnValueOnce(mockChain([]))

    const result = await getTeamReflectionSummaries(['dr-1'], 'mgr-1')
    expect(result[0].rounds[0].selfScore).toBe(2.5)
  })

  it('sets selfScore to null for non-complete rounds', async () => {
    const rounds = [
      { id: 'r1', user_id: 'dr-1', status: 'in_progress', title: null, created_at: '2026-05-22T00:00:00Z', completed_at: null },
    ]
    mockAdminFrom
      .mockReturnValueOnce(mockChain(rounds))
      .mockReturnValueOnce(mockChain([]))
      .mockReturnValueOnce(mockChain([]))

    const result = await getTeamReflectionSummaries(['dr-1'], 'mgr-1')
    expect(result[0].rounds[0].selfScore).toBeNull()
  })

  it('computes managerScoringStatus from manager_scores', async () => {
    const rounds = [
      { id: 'r1', user_id: 'dr-1', status: 'complete', title: null, created_at: '2026-05-20T00:00:00Z', completed_at: '2026-05-20T12:00:00Z' },
    ]
    const mgrScores = [{ round_id: 'r1', skill_key: 'sk1', level: 'Meeting' }]
    mockAdminFrom
      .mockReturnValueOnce(mockChain(rounds))
      .mockReturnValueOnce(mockChain([]))
      .mockReturnValueOnce(mockChain(mgrScores))

    const result = await getTeamReflectionSummaries(['dr-1'], 'mgr-1')
    expect(result[0].rounds[0].managerScoringStatus).toBe('in_progress')
    expect(result[0].rounds[0].pillarsScored).toBe(1)
  })

  it('sets pendingScoringCount correctly', async () => {
    const rounds = [
      { id: 'r1', user_id: 'dr-1', status: 'complete', title: null, created_at: '2026-05-20T00:00:00Z', completed_at: '2026-05-20T12:00:00Z' },
      { id: 'r2', user_id: 'dr-1', status: 'complete', title: null, created_at: '2026-04-01T00:00:00Z', completed_at: '2026-04-01T12:00:00Z' },
    ]
    const mgrScores = [
      { round_id: 'r2', skill_key: 'sk1', level: 'Meeting' },
      { round_id: 'r2', skill_key: 'sk2', level: 'Meeting' },
    ]
    mockAdminFrom
      .mockReturnValueOnce(mockChain(rounds))
      .mockReturnValueOnce(mockChain([]))
      .mockReturnValueOnce(mockChain(mgrScores))

    const result = await getTeamReflectionSummaries(['dr-1'], 'mgr-1')
    expect(result[0].pendingScoringCount).toBe(1)
  })

  it('sorts DRs with pending scoring before fully scored DRs', async () => {
    const rounds = [
      { id: 'r1', user_id: 'dr-1', status: 'complete', title: null, created_at: '2026-05-20T00:00:00Z', completed_at: '2026-05-20T12:00:00Z' },
      { id: 'r2', user_id: 'dr-2', status: 'complete', title: null, created_at: '2026-05-21T00:00:00Z', completed_at: '2026-05-21T12:00:00Z' },
    ]
    const mgrScores = [
      { round_id: 'r1', skill_key: 'sk1', level: 'Meeting' },
      { round_id: 'r1', skill_key: 'sk2', level: 'Meeting' },
    ]
    mockAdminFrom
      .mockReturnValueOnce(mockChain(rounds))
      .mockReturnValueOnce(mockChain([]))
      .mockReturnValueOnce(mockChain(mgrScores))

    const result = await getTeamReflectionSummaries(['dr-1', 'dr-2'], 'mgr-1')
    expect(result[0].directReportId).toBe('dr-2')
    expect(result[1].directReportId).toBe('dr-1')
  })
})
