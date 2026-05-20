import { describe, it, expect, vi, beforeEach } from 'vitest'

const mocks = vi.hoisted(() => ({
  verifyOtp: vi.fn(),
  profilesUpsert: vi.fn(),
  pendingSelect: vi.fn(),
  pendingDelete: vi.fn(),
  connectionsInsert: vi.fn(),
  nodeInvitesSelect: vi.fn(),
  nodeInvitesDelete: vi.fn(),
  orgMembersUpsert: vi.fn(),
  nodeMembersInsert: vi.fn(),
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
      if (table === 'pending_org_node_invitations') {
        return {
          select: () => ({ eq: mocks.nodeInvitesSelect }),
          delete: () => ({ eq: mocks.nodeInvitesDelete }),
        }
      }
      if (table === 'org_members') {
        return { upsert: mocks.orgMembersUpsert }
      }
      if (table === 'org_node_members') {
        return { insert: mocks.nodeMembersInsert }
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
    mocks.nodeInvitesSelect.mockResolvedValue({ data: [], error: null })
    mocks.nodeInvitesDelete.mockResolvedValue({ error: null })
    mocks.orgMembersUpsert.mockResolvedValue({ error: null })
    mocks.nodeMembersInsert.mockResolvedValue({ error: null })
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
    expect(mocks.pendingDelete).toHaveBeenCalledWith('invited_email', 'new@example.com')
  })

  it('creates multiple connections and deletes once when there are multiple pending invites', async () => {
    mocks.verifyOtp.mockResolvedValue({
      data: { user: { id: 'new-user', email: 'new@example.com' } },
      error: null,
    })
    mocks.pendingSelect.mockResolvedValue({
      data: [
        { id: 'inv-1', inviter_id: 'inviter-1', inviter_role: 'manager' },
        { id: 'inv-2', inviter_id: 'inviter-2', inviter_role: 'direct_report' },
      ],
      error: null,
    })
    const { confirmLogin } = await import('@/app/auth/confirm/actions')
    const fd = new FormData()
    fd.set('token_hash', 'abc123')
    await expect(confirmLogin(fd)).rejects.toThrow('NEXT_REDIRECT:/dashboard')
    expect(mocks.connectionsInsert).toHaveBeenCalledTimes(2)
    expect(mocks.pendingDelete).toHaveBeenCalledTimes(1)
    expect(mocks.pendingDelete).toHaveBeenCalledWith('invited_email', 'new@example.com')
  })

  it('redirects to /dashboard and does not insert connections when pending_invitations SELECT fails', async () => {
    mocks.verifyOtp.mockResolvedValue({
      data: { user: { id: 'user-1', email: 'user@example.com' } },
      error: null,
    })
    mocks.pendingSelect.mockResolvedValue({ data: null, error: { message: 'DB error' } })
    const { confirmLogin } = await import('@/app/auth/confirm/actions')
    const fd = new FormData()
    fd.set('token_hash', 'abc123')
    await expect(confirmLogin(fd)).rejects.toThrow('NEXT_REDIRECT:/dashboard')
    expect(mocks.connectionsInsert).not.toHaveBeenCalled()
    expect(mocks.pendingDelete).not.toHaveBeenCalled()
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

describe('confirmLogin — pending_org_node_invitations processing', () => {
  it('inserts into org_members and org_node_members for each pending org node invite', async () => {
    mocks.verifyOtp.mockResolvedValue({
      data: { user: { id: 'new-user', email: 'new@example.com' } },
      error: null,
    })
    mocks.nodeInvitesSelect.mockResolvedValue({
      data: [{ id: 'ni-1', org_id: 'org-1', node_id: 'node-1' }],
      error: null,
    })

    const { confirmLogin } = await import('@/app/auth/confirm/actions')
    const fd = new FormData()
    fd.set('token_hash', 'abc123')
    await expect(confirmLogin(fd)).rejects.toThrow('NEXT_REDIRECT:/dashboard')

    expect(mocks.orgMembersUpsert).toHaveBeenCalledWith(
      { org_id: 'org-1', user_id: 'new-user', role: 'member' },
      { onConflict: 'org_id,user_id', ignoreDuplicates: true }
    )
    expect(mocks.nodeMembersInsert).toHaveBeenCalledWith(
      { node_id: 'node-1', user_id: 'new-user' }
    )
    expect(mocks.nodeInvitesDelete).toHaveBeenCalledWith('invited_email', 'new@example.com')
  })

  it('still redirects to /dashboard when node invite SELECT fails', async () => {
    mocks.verifyOtp.mockResolvedValue({
      data: { user: { id: 'new-user', email: 'new@example.com' } },
      error: null,
    })
    mocks.nodeInvitesSelect.mockResolvedValue({ data: null, error: { message: 'DB error' } })

    const { confirmLogin } = await import('@/app/auth/confirm/actions')
    const fd = new FormData()
    fd.set('token_hash', 'abc123')
    await expect(confirmLogin(fd)).rejects.toThrow('NEXT_REDIRECT:/dashboard')
    expect(mocks.nodeMembersInsert).not.toHaveBeenCalled()
  })

  it('does not delete invites when none found', async () => {
    mocks.verifyOtp.mockResolvedValue({
      data: { user: { id: 'new-user', email: 'new@example.com' } },
      error: null,
    })
    // nodeInvitesSelect default: { data: [], error: null }

    const { confirmLogin } = await import('@/app/auth/confirm/actions')
    const fd = new FormData()
    fd.set('token_hash', 'abc123')
    await expect(confirmLogin(fd)).rejects.toThrow('NEXT_REDIRECT:/dashboard')
    expect(mocks.nodeMembersInsert).not.toHaveBeenCalled()
    expect(mocks.nodeInvitesDelete).not.toHaveBeenCalled()
  })
})
