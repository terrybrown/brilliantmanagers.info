import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockInsert = vi.fn()
const mockEq = vi.fn()
const mockSelect = vi.fn()
const mockFrom = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({ from: mockFrom }),
}))

describe('createPendingInvitation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFrom.mockReturnValue({ insert: mockInsert })
    mockInsert.mockResolvedValue({ error: null })
  })

  it('inserts a row into pending_invitations and returns {}', async () => {
    const { createPendingInvitation } = await import('@/lib/db/pending-invitations')
    const result = await createPendingInvitation({
      inviterId: 'user-1',
      invitedEmail: 'new@example.com',
      inviterRole: 'manager',
    })
    expect(result).toEqual({})
    expect(mockFrom).toHaveBeenCalledWith('pending_invitations')
    expect(mockInsert).toHaveBeenCalledWith({
      inviter_id: 'user-1',
      invited_email: 'new@example.com',
      inviter_role: 'manager',
    })
  })

  it('returns { error } when the insert fails', async () => {
    mockInsert.mockResolvedValueOnce({ error: { message: 'DB error' } })
    const { createPendingInvitation } = await import('@/lib/db/pending-invitations')
    const result = await createPendingInvitation({
      inviterId: 'user-1',
      invitedEmail: 'new@example.com',
      inviterRole: 'direct_report',
    })
    expect(result).toEqual({ error: 'DB error' })
  })

  it('returns a friendly error message on duplicate invite', async () => {
    mockInsert.mockResolvedValueOnce({ error: { code: '23505', message: 'duplicate key ...' } })
    const { createPendingInvitation } = await import('@/lib/db/pending-invitations')
    const result = await createPendingInvitation({
      inviterId: 'user-1',
      invitedEmail: 'new@example.com',
      inviterRole: 'manager',
    })
    expect(result).toEqual({ error: 'You have already invited this person.' })
  })
})

describe('getPendingInvitationsForInviter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSelect.mockReturnValue({ eq: mockEq })
    mockFrom.mockReturnValue({ select: mockSelect })
    mockEq.mockResolvedValue({ data: [], error: null })
  })

  it('returns an array of invitations on success', async () => {
    const rows = [
      {
        id: 'inv-1',
        inviter_id: 'user-1',
        invited_email: 'a@example.com',
        inviter_role: 'manager',
        created_at: '2026-01-01T00:00:00Z',
      },
      {
        id: 'inv-2',
        inviter_id: 'user-1',
        invited_email: 'b@example.com',
        inviter_role: 'direct_report',
        created_at: '2026-01-02T00:00:00Z',
      },
    ]
    mockEq.mockResolvedValueOnce({ data: rows, error: null })
    const { getPendingInvitationsForInviter } = await import('@/lib/db/pending-invitations')
    const result = await getPendingInvitationsForInviter('user-1')
    expect(result).toEqual(rows)
    expect(mockFrom).toHaveBeenCalledWith('pending_invitations')
    expect(mockSelect).toHaveBeenCalledWith('*')
    expect(mockEq).toHaveBeenCalledWith('inviter_id', 'user-1')
  })

  it('returns [] on Supabase error', async () => {
    mockEq.mockResolvedValueOnce({ data: null, error: { message: 'DB error' } })
    const { getPendingInvitationsForInviter } = await import('@/lib/db/pending-invitations')
    const result = await getPendingInvitationsForInviter('user-1')
    expect(result).toEqual([])
  })
})
