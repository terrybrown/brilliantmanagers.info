import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFrom = vi.hoisted(() => vi.fn())

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({ from: mockFrom }),
}))
vi.mock('@/lib/db/manager-scores', () => ({
  getManagerScoringStatus: vi.fn().mockResolvedValue('not_started'),
  getManagerScoresForDirectReport: vi.fn().mockResolvedValue([]),
}))
vi.mock('@/lib/skills', () => ({
  PILLARS: ['self', 'team'],
  getSkillsByPillar: (p: string) =>
    p === 'self' ? [{ key: 'sk1' }] : [{ key: 'sk2' }],
  LEVEL_VALUES: { Developing: 1, Approaching: 2, Meeting: 3, Exceeding: 4, Leading: 5 },
}))

beforeEach(() => vi.clearAllMocks())

import { getTeamReflectionSummaries } from '@/lib/db/direct-reports'
import { getManagerScoringStatus } from '@/lib/db/manager-scores'

describe('getTeamReflectionSummaries', () => {
  it('returns empty array when no direct report IDs provided', async () => {
    expect(await getTeamReflectionSummaries([], 'mgr-1')).toEqual([])
  })

  it('returns empty array when no rounds found', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        in: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
    })
    expect(await getTeamReflectionSummaries(['dr-1'], 'mgr-1')).toEqual([])
  })

  it('returns one summary per DR using their latest round', async () => {
    const rows = [
      { id: 'r1', user_id: 'dr-1', status: 'complete', created_at: '2026-05-20T00:00:00Z', completed_at: '2026-05-20T12:00:00Z' },
      { id: 'r2', user_id: 'dr-2', status: 'in_progress', created_at: '2026-05-21T00:00:00Z', completed_at: null },
    ]
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        in: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: rows, error: null }),
        }),
      }),
    })

    const result = await getTeamReflectionSummaries(['dr-1', 'dr-2'], 'mgr-1')
    expect(result).toHaveLength(2)
    expect(result.map(r => r.directReportId)).toContain('dr-1')
    expect(result.map(r => r.directReportId)).toContain('dr-2')
  })

  it('uses only the latest round per DR when multiple rounds exist', async () => {
    const rows = [
      { id: 'r2', user_id: 'dr-1', status: 'in_progress', created_at: '2026-05-21T00:00:00Z', completed_at: null },
      { id: 'r1', user_id: 'dr-1', status: 'complete', created_at: '2026-05-20T00:00:00Z', completed_at: '2026-05-20T12:00:00Z' },
    ]
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        in: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: rows, error: null }),
        }),
      }),
    })

    const result = await getTeamReflectionSummaries(['dr-1'], 'mgr-1')
    expect(result).toHaveLength(1)
    expect(result[0].roundId).toBe('r2')
  })

  it('places pending-scoring DRs before completed ones', async () => {
    const rows = [
      { id: 'r1', user_id: 'dr-1', status: 'complete', created_at: '2026-05-20T00:00:00Z', completed_at: '2026-05-20T12:00:00Z' },
      { id: 'r2', user_id: 'dr-2', status: 'complete', created_at: '2026-05-21T00:00:00Z', completed_at: '2026-05-21T12:00:00Z' },
    ]
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        in: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: rows, error: null }),
        }),
      }),
    })

    vi.mocked(getManagerScoringStatus)
      .mockResolvedValueOnce('complete')   // dr-1
      .mockResolvedValueOnce('not_started') // dr-2

    const result = await getTeamReflectionSummaries(['dr-1', 'dr-2'], 'mgr-1')
    expect(result[0].directReportId).toBe('dr-2') // not_started comes first
    expect(result[1].directReportId).toBe('dr-1') // complete comes last
  })
})
