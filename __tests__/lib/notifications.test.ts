import { describe, it, expect, vi, beforeEach } from 'vitest'

// Build the mock chain bottom-up so each level can be reset per test.
const mockIs = vi.fn()
const mockLimit = vi.fn()
const mockOrder = vi.fn().mockReturnValue({ limit: mockLimit })
const mockEq = vi.fn().mockReturnValue({ order: mockOrder, is: mockIs })
const mockInsert = vi.fn()
const mockUpdate = vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ is: mockIs }) })
const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
const mockFrom = vi.fn().mockReturnValue({
  select: mockSelect,
  insert: mockInsert,
  update: mockUpdate,
})

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn().mockReturnValue({ from: mockFrom }),
}))
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({ from: mockFrom }),
}))

describe('createNotification', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFrom.mockReturnValue({ select: mockSelect, insert: mockInsert, update: mockUpdate })
    mockInsert.mockResolvedValue({ error: null })
  })

  it('calls insert with user_id, type, and payload', async () => {
    const { createNotification } = await import('@/lib/notifications')
    await createNotification('user-1', 'manager_scoring_needed', { roundId: 'r-1' })

    expect(mockFrom).toHaveBeenCalledWith('notifications')
    expect(mockInsert).toHaveBeenCalledWith({
      user_id: 'user-1',
      type: 'manager_scoring_needed',
      payload: { roundId: 'r-1' },
    })
  })

  it('defaults payload to empty object when not provided', async () => {
    const { createNotification } = await import('@/lib/notifications')
    await createNotification('user-2', 'connection_accepted')

    expect(mockInsert).toHaveBeenCalledWith({
      user_id: 'user-2',
      type: 'connection_accepted',
      payload: {},
    })
  })
})

describe('getUnreadCount', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Rebuild the chain so is() resolves with a count
    const mockIsInner = vi.fn()
    const mockEqInner = vi.fn().mockReturnValue({ is: mockIsInner })
    const mockSelectInner = vi.fn().mockReturnValue({ eq: mockEqInner })
    mockFrom.mockReturnValue({
      select: mockSelectInner,
      insert: mockInsert,
      update: mockUpdate,
    })
    ;(mockFrom as ReturnType<typeof vi.fn>)._selectInner = mockSelectInner
    ;(mockFrom as ReturnType<typeof vi.fn>)._eqInner = mockEqInner
    ;(mockFrom as ReturnType<typeof vi.fn>)._isInner = mockIsInner
  })

  it('returns the count from the database', async () => {
    const isInner = (mockFrom as ReturnType<typeof vi.fn>)._isInner as ReturnType<typeof vi.fn>
    isInner.mockResolvedValue({ count: 7, error: null })

    const { getUnreadCount } = await import('@/lib/notifications')
    const result = await getUnreadCount('user-1')

    expect(result).toBe(7)
    const eqInner = (mockFrom as ReturnType<typeof vi.fn>)._eqInner as ReturnType<typeof vi.fn>
    expect(eqInner).toHaveBeenCalledWith('user_id', 'user-1')
    expect(isInner).toHaveBeenCalledWith('read_at', null)
  })

  it('returns 0 when count is null', async () => {
    const isInner = (mockFrom as ReturnType<typeof vi.fn>)._isInner as ReturnType<typeof vi.fn>
    isInner.mockResolvedValue({ count: null, error: null })

    const { getUnreadCount } = await import('@/lib/notifications')
    const result = await getUnreadCount('user-1')

    expect(result).toBe(0)
  })
})

describe('getNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Build a fresh chain: select -> eq -> order -> limit -> resolves
    const mockLimitInner = vi.fn()
    const mockOrderInner = vi.fn().mockReturnValue({ limit: mockLimitInner })
    const mockEqInner = vi.fn().mockReturnValue({ order: mockOrderInner })
    const mockSelectInner = vi.fn().mockReturnValue({ eq: mockEqInner })
    mockFrom.mockReturnValue({
      select: mockSelectInner,
      insert: mockInsert,
      update: mockUpdate,
    })
    ;(mockFrom as ReturnType<typeof vi.fn>)._limitInner = mockLimitInner
    ;(mockFrom as ReturnType<typeof vi.fn>)._orderInner = mockOrderInner
    ;(mockFrom as ReturnType<typeof vi.fn>)._eqInner = mockEqInner
    ;(mockFrom as ReturnType<typeof vi.fn>)._selectInner = mockSelectInner
  })

  it('maps snake_case DB rows to camelCase Notification objects', async () => {
    const rows = [
      {
        id: 'n-1',
        user_id: 'user-1',
        type: 'manager_scoring_needed',
        payload: { roundId: 'r-1' },
        read_at: null,
        created_at: '2026-05-22T10:00:00Z',
      },
      {
        id: 'n-2',
        user_id: 'user-1',
        type: 'connection_accepted',
        payload: {},
        read_at: '2026-05-22T11:00:00Z',
        created_at: '2026-05-22T09:00:00Z',
      },
    ]
    const limitInner = (mockFrom as ReturnType<typeof vi.fn>)._limitInner as ReturnType<typeof vi.fn>
    limitInner.mockResolvedValue({ data: rows, error: null })

    const { getNotifications } = await import('@/lib/notifications')
    const result = await getNotifications('user-1')

    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({
      id: 'n-1',
      userId: 'user-1',
      type: 'manager_scoring_needed',
      payload: { roundId: 'r-1' },
      readAt: null,
      createdAt: '2026-05-22T10:00:00Z',
    })
    expect(result[1]).toEqual({
      id: 'n-2',
      userId: 'user-1',
      type: 'connection_accepted',
      payload: {},
      readAt: '2026-05-22T11:00:00Z',
      createdAt: '2026-05-22T09:00:00Z',
    })
  })

  it('returns empty array when data is null', async () => {
    const limitInner = (mockFrom as ReturnType<typeof vi.fn>)._limitInner as ReturnType<typeof vi.fn>
    limitInner.mockResolvedValue({ data: null, error: null })

    const { getNotifications } = await import('@/lib/notifications')
    const result = await getNotifications('user-1')

    expect(result).toEqual([])
  })

  it('queries notifications ordered by created_at descending with limit 50', async () => {
    const limitInner = (mockFrom as ReturnType<typeof vi.fn>)._limitInner as ReturnType<typeof vi.fn>
    limitInner.mockResolvedValue({ data: [], error: null })

    const { getNotifications } = await import('@/lib/notifications')
    await getNotifications('user-1')

    const eqInner = (mockFrom as ReturnType<typeof vi.fn>)._eqInner as ReturnType<typeof vi.fn>
    const orderInner = (mockFrom as ReturnType<typeof vi.fn>)._orderInner as ReturnType<typeof vi.fn>
    expect(eqInner).toHaveBeenCalledWith('user_id', 'user-1')
    expect(orderInner).toHaveBeenCalledWith('created_at', { ascending: false })
    expect(limitInner).toHaveBeenCalledWith(50)
  })
})
