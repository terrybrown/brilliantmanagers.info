// __tests__/lib/email/mailgun.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('sendEmail', () => {
  beforeEach(() => {
    vi.stubEnv('MAILGUN_DOMAIN', 'mg.example.com')
    vi.stubEnv('MAILGUN_BASE_URL', 'https://api.eu.mailgun.net')
    vi.stubEnv('MAILGUN_SENDING_KEY', 'test-sending-key')
    vi.stubEnv('MAILGUN_FROM_EMAIL', 'noreply@example.com')
    mockFetch.mockResolvedValue({ ok: true, text: async () => '' })
  })
  afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks() })

  it('POSTs to the correct Mailgun endpoint', async () => {
    const { sendEmail } = await import('@/lib/email/mailgun')
    await sendEmail({ to: 'boss@example.com', subject: 'Hello', html: '<p>Hi</p>' })
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.eu.mailgun.net/v3/mg.example.com/messages',
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('sets Basic auth header using MAILGUN_SENDING_KEY', async () => {
    const { sendEmail } = await import('@/lib/email/mailgun')
    await sendEmail({ to: 'x@y.com', subject: 'S', html: '<p></p>' })
    const [, init] = mockFetch.mock.calls[0]
    const expected = `Basic ${Buffer.from('api:test-sending-key').toString('base64')}`
    expect(init.headers['Authorization']).toBe(expected)
  })

  it('throws on non-OK response', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 401, text: async () => 'Unauthorized' })
    const { sendEmail } = await import('@/lib/email/mailgun')
    await expect(sendEmail({ to: 'x@y.com', subject: 'S', html: '<p></p>' })).rejects.toThrow(
      'Mailgun error 401'
    )
  })

  it('throws when required env vars are missing', async () => {
    vi.unstubAllEnvs()
    const { sendEmail } = await import('@/lib/email/mailgun')
    await expect(sendEmail({ to: 'x@y.com', subject: 'S', html: '<p></p>' })).rejects.toThrow(
      'Mailgun configuration missing'
    )
  })
})
