// __tests__/lib/email/org-node-invite.test.ts
import { describe, it, expect, vi, afterEach } from 'vitest'
import { buildOrgNodeInviteEmail } from '@/lib/email/templates/org-node-invite'

afterEach(() => vi.unstubAllEnvs())

describe('buildOrgNodeInviteEmail', () => {
  it('includes the org name in the subject', () => {
    const { subject } = buildOrgNodeInviteEmail({
      inviterName: 'Alice',
      orgName: 'Acme Corp',
      nodeName: 'Engineering',
    })
    expect(subject).toContain('Acme Corp')
  })

  it('includes the node name and org name in the html body', () => {
    const { html } = buildOrgNodeInviteEmail({
      inviterName: 'Alice',
      orgName: 'Acme Corp',
      nodeName: 'Engineering',
    })
    expect(html).toContain('Engineering')
    expect(html).toContain('Acme Corp')
  })

  it('includes the inviter name in the html body', () => {
    const { html } = buildOrgNodeInviteEmail({
      inviterName: 'Alice',
      orgName: 'Acme Corp',
      nodeName: 'Engineering',
    })
    expect(html).toContain('Alice')
  })

  it('links to /the-tool using NEXT_PUBLIC_APP_URL', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://app.example.com')
    const { html } = buildOrgNodeInviteEmail({
      inviterName: 'Alice',
      orgName: 'Acme Corp',
      nodeName: 'Engineering',
    })
    expect(html).toContain('https://app.example.com/the-tool')
  })

  it('falls back to brilliantmanagers.info/the-tool when NEXT_PUBLIC_APP_URL is not set', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', undefined as unknown as string)
    const { html } = buildOrgNodeInviteEmail({
      inviterName: 'Alice',
      orgName: 'Acme Corp',
      nodeName: 'Engineering',
    })
    expect(html).toContain('https://brilliantmanagers.info/the-tool')
  })
})
