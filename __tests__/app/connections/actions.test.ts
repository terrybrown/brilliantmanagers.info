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

vi.mock('@/lib/db/connections', () => ({
  createConnection: vi.fn().mockResolvedValue({}),
  acceptConnection: vi.fn().mockResolvedValue({}),
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

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

describe('inviteConnection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('returns { success: true } on happy path', async () => {
    const { inviteConnection } = await import('@/app/(app)/connections/actions')
    const fd = new FormData()
    fd.set('email', 'boss@example.com')
    fd.set('role', 'direct_report')
    const result = await inviteConnection({ success: false }, fd)
    expect(result).toEqual({ success: true })
  })

  it('calls sendEmail when role is direct_report', async () => {
    const { sendEmail } = await import('@/lib/email/mailgun')
    const { inviteConnection } = await import('@/app/(app)/connections/actions')
    const fd = new FormData()
    fd.set('email', 'boss@example.com')
    fd.set('role', 'direct_report')
    await inviteConnection({ success: false }, fd)
    expect(sendEmail).toHaveBeenCalledOnce()
  })

  it('does NOT call sendEmail when role is manager', async () => {
    const { sendEmail } = await import('@/lib/email/mailgun')
    const { inviteConnection } = await import('@/app/(app)/connections/actions')
    const fd = new FormData()
    fd.set('email', 'report@example.com')
    fd.set('role', 'manager')
    await inviteConnection({ success: false }, fd)
    expect(sendEmail).not.toHaveBeenCalled()
  })

  it('returns { success: false, error } when createConnection fails', async () => {
    const { createConnection } = await import('@/lib/db/connections')
    vi.mocked(createConnection).mockResolvedValueOnce({ error: 'No account found for that email. Ask them to sign up first.' })
    const { inviteConnection } = await import('@/app/(app)/connections/actions')
    const fd = new FormData()
    fd.set('email', 'nobody@example.com')
    fd.set('role', 'direct_report')
    const result = await inviteConnection({ success: false }, fd)
    expect(result.success).toBe(false)
    expect(result.error).toContain('No account')
  })
})
