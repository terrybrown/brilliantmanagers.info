// __tests__/lib/email/manager-invite.test.ts
import { describe, it, expect, vi, afterEach } from 'vitest'
import { buildManagerInviteEmail } from '@/lib/email/templates/manager-invite'

afterEach(() => { vi.unstubAllEnvs() })

describe('buildManagerInviteEmail', () => {
  it('includes sender name in subject', () => {
    const { subject } = buildManagerInviteEmail({ fromName: 'Alice', toEmail: 'bob@example.com' })
    expect(subject).toContain('Alice')
  })

  it('includes a link to /people in the html body', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://app.example.com')
    const { html } = buildManagerInviteEmail({ fromName: 'Alice', toEmail: 'bob@example.com' })
    expect(html).toContain('https://app.example.com/people')
  })

  it('includes the personal message when provided', () => {
    const { html } = buildManagerInviteEmail({
      fromName: 'Alice',
      toEmail: 'bob@example.com',
      personalMessage: 'Hi Bob, join me!',
    })
    expect(html).toContain('Hi Bob, join me!')
  })

  it('omits the personal message block when not provided', () => {
    const { html } = buildManagerInviteEmail({ fromName: 'Alice', toEmail: 'bob@example.com' })
    expect(html).not.toContain('personal-message')
  })
})
