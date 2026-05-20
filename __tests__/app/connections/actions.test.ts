import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1', email: 'me@example.com' } } }),
    },
    from: vi.fn((table: string) => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: table === 'profiles' ? { display_name: 'Alice' } : null,
      }),
    })),
  }),
}))

vi.mock('@/lib/db/connections', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/db/connections')>()
  return {
    ...actual,
    createConnection: vi.fn().mockResolvedValue({}),
    acceptConnection: vi.fn().mockResolvedValue({}),
  }
})

vi.mock('@/lib/db/pending-invitations', () => ({
  createPendingInvitation: vi.fn().mockResolvedValue({}),
}))

vi.mock('@/lib/audit', () => ({
  logAudit: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/email/mailgun', () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/email/templates/manager-invite', () => ({
  buildManagerInviteEmail: vi.fn().mockReturnValue({ subject: 'S', html: '<p></p>' }),
}))

vi.mock('@/lib/email/templates/connection-invite', () => ({
  buildConnectionInviteEmail: vi.fn().mockReturnValue({ subject: 'S', html: '<p></p>' }),
}))

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

describe('inviteConnection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('returns { success: true } when connection is created for an existing user', async () => {
    const { inviteConnection } = await import('@/app/(app)/connections/actions')
    const fd = new FormData()
    fd.set('email', 'boss@example.com')
    fd.set('role', 'direct_report')
    const result = await inviteConnection({ success: false }, fd)
    expect(result).toEqual({ success: true })
  })

  it('calls sendEmail with the manager-invite template when role is direct_report and user exists', async () => {
    const { sendEmail } = await import('@/lib/email/mailgun')
    const { inviteConnection } = await import('@/app/(app)/connections/actions')
    const fd = new FormData()
    fd.set('email', 'boss@example.com')
    fd.set('role', 'direct_report')
    await inviteConnection({ success: false }, fd)
    expect(sendEmail).toHaveBeenCalledOnce()
  })

  it('does NOT call sendEmail when role is manager and user exists', async () => {
    const { sendEmail } = await import('@/lib/email/mailgun')
    const { inviteConnection } = await import('@/app/(app)/connections/actions')
    const fd = new FormData()
    fd.set('email', 'report@example.com')
    fd.set('role', 'manager')
    await inviteConnection({ success: false }, fd)
    expect(sendEmail).not.toHaveBeenCalled()
  })

  it('creates a pending invitation when no account is found, and returns success', async () => {
    const { createConnection } = await import('@/lib/db/connections')
    vi.mocked(createConnection).mockResolvedValueOnce({
      error: 'No account found for that email. Ask them to sign up first.',
    })
    const { createPendingInvitation } = await import('@/lib/db/pending-invitations')
    const { inviteConnection } = await import('@/app/(app)/connections/actions')
    const fd = new FormData()
    fd.set('email', 'nobody@example.com')
    fd.set('role', 'direct_report')
    const result = await inviteConnection({ success: false }, fd)
    expect(result).toEqual({ success: true })
    expect(vi.mocked(createPendingInvitation)).toHaveBeenCalledWith({
      inviterId: 'user-1',
      invitedEmail: 'nobody@example.com',
      inviterRole: 'direct_report',
    })
    const { logAudit } = await import('@/lib/audit')
    expect(vi.mocked(logAudit)).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'connection.invite_pending' })
    )
  })

  it('sends the connection-invite email when no account is found', async () => {
    const { createConnection } = await import('@/lib/db/connections')
    vi.mocked(createConnection).mockResolvedValueOnce({
      error: 'No account found for that email. Ask them to sign up first.',
    })
    const { sendEmail } = await import('@/lib/email/mailgun')
    const { buildConnectionInviteEmail } = await import('@/lib/email/templates/connection-invite')
    const { inviteConnection } = await import('@/app/(app)/connections/actions')
    const fd = new FormData()
    fd.set('email', 'nobody@example.com')
    fd.set('role', 'manager')
    await inviteConnection({ success: false }, fd)
    expect(vi.mocked(buildConnectionInviteEmail)).toHaveBeenCalledWith(
      expect.objectContaining({ fromName: 'Alice', inviterRole: 'manager' })
    )
    expect(sendEmail).toHaveBeenCalledOnce()
  })

  it('returns { success: false, error } for non-account errors from createConnection', async () => {
    const { createConnection } = await import('@/lib/db/connections')
    vi.mocked(createConnection).mockResolvedValueOnce({ error: 'Connection already exists.' })
    const { inviteConnection } = await import('@/app/(app)/connections/actions')
    const fd = new FormData()
    fd.set('email', 'existing@example.com')
    fd.set('role', 'direct_report')
    const result = await inviteConnection({ success: false }, fd)
    expect(result.success).toBe(false)
    expect(result.error).toBe('Connection already exists.')
  })

  it('returns { success: false, error } when createPendingInvitation fails', async () => {
    const { createConnection } = await import('@/lib/db/connections')
    vi.mocked(createConnection).mockResolvedValueOnce({
      error: 'No account found for that email. Ask them to sign up first.',
    })
    const { createPendingInvitation } = await import('@/lib/db/pending-invitations')
    vi.mocked(createPendingInvitation).mockResolvedValueOnce({ error: 'DB write failed' })
    const { inviteConnection } = await import('@/app/(app)/connections/actions')
    const fd = new FormData()
    fd.set('email', 'nobody@example.com')
    fd.set('role', 'direct_report')
    const result = await inviteConnection({ success: false }, fd)
    expect(result.success).toBe(false)
    expect(result.error).toBe('DB write failed')
  })
})
