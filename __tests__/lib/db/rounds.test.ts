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

describe('maybeCompleteRound', () => {
  const ALL_PILLARS = ['self', 'team', 'strategy', 'communications', 'domain-expertise']

  function makeScoresChain(scores: { pillar: string }[]) {
    const scoresEq = vi.fn().mockResolvedValue({ data: scores, error: null })
    const scoresSelect = vi.fn().mockReturnValue({ eq: scoresEq })
    return { select: scoresSelect }
  }

  function makeUpdateChain(error: unknown) {
    const updateEq = vi.fn().mockResolvedValue({ error })
    const update = vi.fn().mockReturnValue({ eq: updateEq })
    return { update }
  }

  it('returns false when not all pillars are scored', async () => {
    vi.clearAllMocks()
    // Only 'self' is scored — missing 4 pillars
    mockFrom.mockImplementation((table: string) => {
      if (table === 'scores') return makeScoresChain([{ pillar: 'self' }])
      return makeUpdateChain(null)
    })

    const { maybeCompleteRound } = await import('@/lib/db/rounds')
    const result = await maybeCompleteRound('round-1')
    expect(result).toBe(false)
  })

  it('returns true and updates the round when all pillars are scored', async () => {
    vi.clearAllMocks()
    const allScores = ALL_PILLARS.map(pillar => ({ pillar }))
    const updateEq = vi.fn().mockResolvedValue({ error: null })
    const update = vi.fn().mockReturnValue({ eq: updateEq })

    mockFrom.mockImplementation((table: string) => {
      if (table === 'scores') return makeScoresChain(allScores)
      return { update }
    })

    const { maybeCompleteRound } = await import('@/lib/db/rounds')
    const result = await maybeCompleteRound('round-1')
    expect(result).toBe(true)
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'complete' })
    )
  })

  it('throws when the DB update fails', async () => {
    vi.clearAllMocks()
    const allScores = ALL_PILLARS.map(pillar => ({ pillar }))
    const dbError = { message: 'update failed' }

    mockFrom.mockImplementation((table: string) => {
      if (table === 'scores') return makeScoresChain(allScores)
      return makeUpdateChain(dbError)
    })

    const { maybeCompleteRound } = await import('@/lib/db/rounds')
    await expect(maybeCompleteRound('round-1')).rejects.toEqual(dbError)
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
