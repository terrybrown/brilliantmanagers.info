import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSingle = vi.fn()
const mockInsertSelect = vi.fn().mockReturnValue({ single: mockSingle })
const mockInsert = vi.fn().mockReturnValue({ select: mockInsertSelect })

const mockMaybeSingle = vi.fn()
const mockEqUserId = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle })
const mockEqId = vi.fn().mockReturnValue({ eq: mockEqUserId })
const mockSelectStar = vi.fn().mockReturnValue({ eq: mockEqId })

const mockFrom = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({ from: mockFrom }),
}))

describe('createRound', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFrom.mockReturnValue({ insert: mockInsert })
    mockInsert.mockReturnValue({ select: mockInsertSelect })
    mockInsertSelect.mockReturnValue({ single: mockSingle })
  })

  it('inserts a new round and returns it', async () => {
    const round = {
      id: 'r-1',
      user_id: 'u-1',
      status: 'in_progress',
      created_at: '2026-05-21T00:00:00Z',
      completed_at: null,
      title: 'Q2 2026',
      notes: 'Focus on coaching',
      remind_at: '2026-08-01',
    }
    mockSingle.mockResolvedValue({ data: round, error: null })

    const { createRound } = await import('@/lib/db/rounds')
    const result = await createRound('u-1', 'Q2 2026', 'Focus on coaching', '2026-08-01')

    expect(mockFrom).toHaveBeenCalledWith('assessment_rounds')
    expect(mockInsert).toHaveBeenCalledWith({
      user_id: 'u-1',
      status: 'in_progress',
      title: 'Q2 2026',
      notes: 'Focus on coaching',
      remind_at: '2026-08-01',
    })
    expect(result).toEqual(round)
  })

  it('accepts null for optional fields', async () => {
    const round = {
      id: 'r-2',
      user_id: 'u-1',
      status: 'in_progress',
      created_at: '2026-05-21T00:00:00Z',
      completed_at: null,
      title: 'Q2 2026',
      notes: null,
      remind_at: null,
    }
    mockSingle.mockResolvedValue({ data: round, error: null })

    const { createRound } = await import('@/lib/db/rounds')
    const result = await createRound('u-1', 'Q2 2026', null, null)
    expect(result.notes).toBeNull()
    expect(result.remind_at).toBeNull()
    expect(mockInsert).toHaveBeenCalledWith({
      user_id: 'u-1',
      status: 'in_progress',
      title: 'Q2 2026',
      notes: null,
      remind_at: null,
    })
  })

  it('throws when insert fails', async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: 'DB error' } })
    const { createRound } = await import('@/lib/db/rounds')
    await expect(createRound('u-1', 'Q2 2026', null, null)).rejects.toEqual({ message: 'DB error' })
  })
})

describe('getRoundById', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFrom.mockReturnValue({ select: mockSelectStar })
    mockSelectStar.mockReturnValue({ eq: mockEqId })
    mockEqId.mockReturnValue({ eq: mockEqUserId })
    mockEqUserId.mockReturnValue({ maybeSingle: mockMaybeSingle })
  })

  it('returns the round when user_id matches', async () => {
    const round = {
      id: 'r-1',
      user_id: 'u-1',
      status: 'complete',
      created_at: '2026-01-01T00:00:00Z',
      completed_at: '2026-03-31T00:00:00Z',
      title: 'Q1 2026',
      notes: null,
      remind_at: null,
    }
    mockMaybeSingle.mockResolvedValue({ data: round })
    const { getRoundById } = await import('@/lib/db/rounds')
    const result = await getRoundById('r-1', 'u-1')
    expect(result).toEqual(round)
    expect(mockEqId).toHaveBeenCalledWith('id', 'r-1')
    expect(mockEqUserId).toHaveBeenCalledWith('user_id', 'u-1')
  })

  it('returns null when no matching round exists', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null })
    const { getRoundById } = await import('@/lib/db/rounds')
    const result = await getRoundById('r-99', 'u-1')
    expect(result).toBeNull()
  })

  it('throws when the query fails', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: { message: 'DB error' } })
    const { getRoundById } = await import('@/lib/db/rounds')
    await expect(getRoundById('r-1', 'u-1')).rejects.toEqual({ message: 'DB error' })
  })
})
