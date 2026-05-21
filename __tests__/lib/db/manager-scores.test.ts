import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockIn = vi.fn()
const mockSelect = vi.fn().mockReturnValue({ in: mockIn })
const mockFrom = vi.fn().mockReturnValue({ select: mockSelect })

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({ from: mockFrom }),
}))

describe('getManagerScoresForAllRounds', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFrom.mockReturnValue({ select: mockSelect })
    mockSelect.mockReturnValue({ in: mockIn })
  })

  it('returns scores grouped by round_id', async () => {
    const rows = [
      { id: 'ms-1', round_id: 'r-1', manager_id: 'm-1', skill_key: 'self-resilience', level: 'Proficient', scored_at: '2026-01-01' },
      { id: 'ms-2', round_id: 'r-1', manager_id: 'm-1', skill_key: 'team-accountability', level: 'Advanced', scored_at: '2026-01-01' },
      { id: 'ms-3', round_id: 'r-2', manager_id: 'm-1', skill_key: 'self-resilience', level: 'Expert', scored_at: '2026-04-01' },
    ]
    mockIn.mockResolvedValue({ data: rows, error: null })

    const { getManagerScoresForAllRounds } = await import('@/lib/db/manager-scores')
    const result = await getManagerScoresForAllRounds(['r-1', 'r-2'])

    expect(mockFrom).toHaveBeenCalledWith('manager_scores')
    expect(mockSelect).toHaveBeenCalledWith('*')
    expect(mockIn).toHaveBeenCalledWith('round_id', ['r-1', 'r-2'])
    expect(result['r-1']).toHaveLength(2)
    expect(result['r-2']).toHaveLength(1)
    expect(result['r-2'][0].level).toBe('Expert')
  })

  it('returns empty record when given empty round list', async () => {
    const { getManagerScoresForAllRounds } = await import('@/lib/db/manager-scores')
    const result = await getManagerScoresForAllRounds([])
    expect(result).toEqual({})
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('returns empty record on error', async () => {
    mockIn.mockResolvedValue({ data: null, error: { message: 'DB error' } })
    const { getManagerScoresForAllRounds } = await import('@/lib/db/manager-scores')
    const result = await getManagerScoresForAllRounds(['r-1'])
    expect(result).toEqual({})
  })
})
