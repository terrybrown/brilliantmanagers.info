import { describe, it, expect, vi, beforeEach } from 'vitest'

const mocks = vi.hoisted(() => ({
  verifyOtp: vi.fn(),
  profilesUpsert: vi.fn(),
  pendingSelect: vi.fn(),
  pendingDelete: vi.fn(),
  connectionsInsert: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { verifyOtp: mocks.verifyOtp },
    from: (table: string) => {
      if (table === 'profiles') return { upsert: mocks.profilesUpsert }
      return {}
    },
  }),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn().mockReturnValue({
    from: (table: string) => {
      if (table === 'pending_invitations') {
        return {
          select: () => ({ eq: mocks.pendingSelect }),
          delete: () => ({ eq: mocks.pendingDelete }),
        }
      }
      if (table === 'connections') {
        return { insert: mocks.connectionsInsert }
      }
      return {}
    },
  }),
}))

vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`)
  }),
}))

describe('confirmLogin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    mocks.profilesUpsert.mockResolvedValue({ error: null })
    mocks.pendingSelect.mockResolvedValue({ data: [], error: null })
    mocks.pendingDelete.mockResolvedValue({ error: null })
    mocks.connectionsInsert.mockResolvedValue({ error: null })
  })

  it('redirects to /login when token_hash is missing', async () => {
    const { confirmLogin } = await import('@/app/auth/confirm/actions')
    const fd = new FormData()
    await expect(confirmLogin(fd)).rejects.toThrow('NEXT_REDIRECT:/login')
  })

  it('redirects to /dashboard on success when there are no pending invitations', async () => {
    mocks.verifyOtp.mockResolvedValue({
      data: { user: { id: 'user-1', email: 'user@example.com' } },
      error: null,
    })
    const { confirmLogin } = await import('@/app/auth/confirm/actions')
    const fd = new FormData()
    fd.set('token_hash', 'abc123')
    await expect(confirmLogin(fd)).rejects.toThrow('NEXT_REDIRECT:/dashboard')
    expect(mocks.connectionsInsert).not.toHaveBeenCalled()
  })

  it('creates an active connection when inviter_role is manager', async () => {
    mocks.verifyOtp.mockResolvedValue({
      data: { user: { id: 'new-user', email: 'new@example.com' } },
      error: null,
    })
    mocks.pendingSelect.mockResolvedValue({
      data: [{ id: 'inv-1', inviter_id: 'inviter-1', inviter_role: 'manager' }],
      error: null,
    })
    const { confirmLogin } = await import('@/app/auth/confirm/actions')
    const fd = new FormData()
    fd.set('token_hash', 'abc123')
    await expect(confirmLogin(fd)).rejects.toThrow('NEXT_REDIRECT:/dashboard')
    expect(mocks.connectionsInsert).toHaveBeenCalledWith({
      manager_id: 'inviter-1',
      direct_report_id: 'new-user',
      status: 'active',
      initiated_by: 'inviter-1',
    })
    expect(mocks.pendingDelete).toHaveBeenCalledWith('invited_email', 'new@example.com')
  })

  it('creates an active connection when inviter_role is direct_report', async () => {
    mocks.verifyOtp.mockResolvedValue({
      data: { user: { id: 'new-user', email: 'new@example.com' } },
      error: null,
    })
    mocks.pendingSelect.mockResolvedValue({
      data: [{ id: 'inv-2', inviter_id: 'inviter-2', inviter_role: 'direct_report' }],
      error: null,
    })
    const { confirmLogin } = await import('@/app/auth/confirm/actions')
    const fd = new FormData()
    fd.set('token_hash', 'abc123')
    await expect(confirmLogin(fd)).rejects.toThrow('NEXT_REDIRECT:/dashboard')
    expect(mocks.connectionsInsert).toHaveBeenCalledWith({
      manager_id: 'new-user',
      direct_report_id: 'inviter-2',
      status: 'active',
      initiated_by: 'inviter-2',
    })
  })

  it('redirects to error page when verifyOtp fails', async () => {
    mocks.verifyOtp.mockResolvedValue({
      data: { user: null },
      error: { message: 'Token expired' },
    })
    const { confirmLogin } = await import('@/app/auth/confirm/actions')
    const fd = new FormData()
    fd.set('token_hash', 'expired-token')
    await expect(confirmLogin(fd)).rejects.toThrow(
      'NEXT_REDIRECT:/auth/confirm?error=access_denied'
    )
  })
})
