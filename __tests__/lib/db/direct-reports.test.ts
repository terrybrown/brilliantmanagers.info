import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Round } from '@/lib/db/rounds'
import type { ScheduledRound } from '@/lib/db/scheduled-rounds'

let mockInProgress: Round | null = null
let mockScheduled: ScheduledRound | null = null
let mockLastRound: { id: string } | null = null
let mockScoreRows: { level: string }[] = []
let mockManagerCount = 0

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
        // manager_scores
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn(() => Promise.resolve({ count: mockManagerCount })),
        }
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
    mockManagerCount = 0
    vi.clearAllMocks()
  })

  it('returns empty object for empty input', async () => {
    const { getDirectReportRoundSummaries } = await import('@/lib/db/direct-reports')
    expect(await getDirectReportRoundSummaries([])).toEqual({})
  })

  it('returns in_progress status when round is in progress', async () => {
    mockInProgress = { id: 'r1', user_id: 'u1', status: 'in_progress', created_at: '', completed_at: null }
    const { getDirectReportRoundSummaries } = await import('@/lib/db/direct-reports')
    const result = await getDirectReportRoundSummaries(['u1'])
    expect(result['u1'].roundStatus).toBe('in_progress')
  })

  it('returns scheduled status when no in-progress but scheduled exists', async () => {
    mockScheduled = { id: 's1', user_id: 'u1', scheduled_date: '2026-07-01', created_at: '', updated_at: '' }
    const { getDirectReportRoundSummaries } = await import('@/lib/db/direct-reports')
    const result = await getDirectReportRoundSummaries(['u1'])
    expect(result['u1'].roundStatus).toBe('scheduled')
    expect(result['u1'].nextScheduledDate).toBe('2026-07-01')
  })

  it('returns null lastScore when no complete rounds', async () => {
    const { getDirectReportRoundSummaries } = await import('@/lib/db/direct-reports')
    const result = await getDirectReportRoundSummaries(['u1'])
    expect(result['u1'].lastScore).toBeNull()
  })

  it('computes lastScore as average of LEVEL_VALUES', async () => {
    mockLastRound = { id: 'r1' }
    mockScoreRows = [{ level: 'Proficient' }, { level: 'Advanced' }] // 3 + 4 → avg 3.5
    const { getDirectReportRoundSummaries } = await import('@/lib/db/direct-reports')
    const result = await getDirectReportRoundSummaries(['u1'])
    expect(result['u1'].lastScore).toBe(3.5)
  })
})
