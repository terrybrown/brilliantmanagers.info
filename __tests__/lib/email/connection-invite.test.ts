import { describe, it, expect, vi, afterEach } from 'vitest'
import { buildConnectionInviteEmail } from '@/lib/email/templates/connection-invite'

afterEach(() => { vi.unstubAllEnvs() })

describe('buildConnectionInviteEmail', () => {
  it('includes the sender name in the subject', () => {
    const { subject } = buildConnectionInviteEmail({
      fromName: 'Alice',
      inviterRole: 'manager',
    })
    expect(subject).toContain('Alice')
  })

  it('links to /the-tool in the html body', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://app.example.com')
    const { html } = buildConnectionInviteEmail({
      fromName: 'Alice',
      inviterRole: 'manager',
    })
    expect(html).toContain('https://app.example.com/the-tool')
  })

  it('describes the direct report relationship when inviterRole is manager', () => {
    const { html } = buildConnectionInviteEmail({
      fromName: 'Alice',
      inviterRole: 'manager',
    })
    expect(html).toContain('direct report')
  })

  it('describes the manager relationship when inviterRole is direct_report', () => {
    const { html } = buildConnectionInviteEmail({
      fromName: 'Alice',
      inviterRole: 'direct_report',
    })
    expect(html).toContain('invited you as their manager')
  })

  it('includes the personal message when provided', () => {
    const { html } = buildConnectionInviteEmail({
      fromName: 'Alice',
      inviterRole: 'manager',
      personalMessage: 'Hi, join my team!',
    })
    expect(html).toContain('Hi, join my team!')
  })

  it('omits the personal-message block when no message is provided', () => {
    const { html } = buildConnectionInviteEmail({
      fromName: 'Alice',
      inviterRole: 'manager',
    })
    expect(html).not.toContain('personal-message')
  })
})
