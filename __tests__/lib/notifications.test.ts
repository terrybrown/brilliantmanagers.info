import { describe, it, expect, vi, beforeEach } from 'vitest'

// Keep top-level vi.mock declarations (required by Vitest hoisting)
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { createNotification, getNotifications, markAllRead, getUnreadCount } from '@/lib/notifications'

const mockCreateAdminClient = vi.mocked(createAdminClient)
const mockCreateClient = vi.mocked(createClient)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('createNotification', () => {
  it('inserts via admin client with correct fields', async () => {
    const mockInsert = vi.fn().mockResolvedValue({ error: null })
    const mockFrom = vi.fn().mockReturnValue({ insert: mockInsert })
    mockCreateAdminClient.mockReturnValue({ from: mockFrom } as never)

    await createNotification('user-1', 'round_scheduled', { roundId: 'r1' })

    expect(mockInsert).toHaveBeenCalledWith({
      user_id: 'user-1',
      type: 'round_scheduled',
      payload: { roundId: 'r1' },
    })
  })

  it('throws when insert returns an error', async () => {
    const mockInsert = vi.fn().mockResolvedValue({ error: new Error('DB error') })
    mockCreateAdminClient.mockReturnValue({ from: vi.fn().mockReturnValue({ insert: mockInsert }) } as never)

    await expect(createNotification('user-1', 'round_scheduled')).rejects.toThrow('DB error')
  })
})

describe('getUnreadCount', () => {
  function mockCountChain(count: number | null, error: Error | null = null) {
    const mockIs = vi.fn().mockResolvedValue({ count, error })
    const mockEq = vi.fn().mockReturnValue({ is: mockIs })
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
    mockCreateClient.mockResolvedValue({ from: vi.fn().mockReturnValue({ select: mockSelect }) } as never)
    return { mockIs, mockEq, mockSelect }
  }

  it('returns count of unread notifications', async () => {
    mockCountChain(4)
    expect(await getUnreadCount('user-1')).toBe(4)
  })

  it('returns 0 when count is null', async () => {
    mockCountChain(null)
    expect(await getUnreadCount('user-1')).toBe(0)
  })

  it('throws when query errors', async () => {
    const mockIs = vi.fn().mockResolvedValue({ count: null, error: new Error('query failed') })
    const mockEq = vi.fn().mockReturnValue({ is: mockIs })
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
    mockCreateClient.mockResolvedValue({ from: vi.fn().mockReturnValue({ select: mockSelect }) } as never)

    await expect(getUnreadCount('user-1')).rejects.toThrow('query failed')
  })
})

describe('getNotifications', () => {
  function mockListChain(data: object[], error: Error | null = null) {
    const mockLimit = vi.fn().mockResolvedValue({ data, error })
    const mockOrder = vi.fn().mockReturnValue({ limit: mockLimit })
    const mockEq = vi.fn().mockReturnValue({ order: mockOrder })
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
    mockCreateClient.mockResolvedValue({ from: vi.fn().mockReturnValue({ select: mockSelect }) } as never)
  }

  it('maps row fields to camelCase Notification shape', async () => {
    mockListChain([{
      id: 'n1', user_id: 'u1', type: 'round_scheduled',
      payload: {}, read_at: null, created_at: '2026-05-22T00:00:00Z',
    }])
    const result = await getNotifications('u1')
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      id: 'n1', userId: 'u1', type: 'round_scheduled', readAt: null,
    })
  })

  it('filters out unknown notification types', async () => {
    mockListChain([
      { id: 'n1', user_id: 'u1', type: 'unknown_future_type', payload: {}, read_at: null, created_at: '2026-05-22T00:00:00Z' },
      { id: 'n2', user_id: 'u1', type: 'round_scheduled', payload: {}, read_at: null, created_at: '2026-05-22T00:00:00Z' },
    ])
    const result = await getNotifications('u1')
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('n2')
  })

  it('returns empty array when data is null', async () => {
    mockListChain([])
    expect(await getNotifications('u1')).toEqual([])
  })
})

describe('markAllRead', () => {
  it('calls update with correct filter on read_at null', async () => {
    const mockIs = vi.fn().mockResolvedValue({ error: null })
    const mockEq = vi.fn().mockReturnValue({ is: mockIs })
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq })
    mockCreateClient.mockResolvedValue({ from: vi.fn().mockReturnValue({ update: mockUpdate }) } as never)

    await markAllRead('user-1')

    expect(mockUpdate).toHaveBeenCalledWith({ read_at: expect.any(String) })
    expect(mockEq).toHaveBeenCalledWith('user_id', 'user-1')
    expect(mockIs).toHaveBeenCalledWith('read_at', null)
  })
})
