import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db/profiles', () => ({ getProfile: vi.fn() }))
vi.mock('@/lib/email/mailgun', () => ({ sendEmail: vi.fn() }))

import { getProfile } from '@/lib/db/profiles'
import { sendEmail } from '@/lib/email/mailgun'
import {
  sendConnectionRequestEmail,
  sendConnectionAcceptedEmail,
  sendRoundScheduledEmail,
} from '@/lib/email/notifications'

const mockGetProfile = vi.mocked(getProfile)
const mockSendEmail = vi.mocked(sendEmail)

const ENABLED_PROFILE = {
  id: 'u1',
  display_name: 'Alex',
  email: 'alex@example.com',
  email_notifications_enabled: true,
  manager_scoring_blind: false,
  job_title: null,
  bio: null,
  avatar_path: null,
  created_at: '2026-01-01T00:00:00Z',
}

beforeEach(() => vi.clearAllMocks())

describe('sendConnectionRequestEmail', () => {
  it('sends email when notifications enabled', async () => {
    mockGetProfile.mockResolvedValue(ENABLED_PROFILE)
    mockSendEmail.mockResolvedValue(undefined)

    await sendConnectionRequestEmail('u1', 'Jamie')

    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'alex@example.com',
        subject: expect.stringContaining('Jamie'),
      })
    )
  })

  it('skips email when notifications disabled', async () => {
    mockGetProfile.mockResolvedValue({
      ...ENABLED_PROFILE,
      email_notifications_enabled: false,
    })

    await sendConnectionRequestEmail('u1', 'Jamie')

    expect(mockSendEmail).not.toHaveBeenCalled()
  })

  it('skips email when profile has no email', async () => {
    mockGetProfile.mockResolvedValue({ ...ENABLED_PROFILE, email: null })

    await sendConnectionRequestEmail('u1', 'Jamie')

    expect(mockSendEmail).not.toHaveBeenCalled()
  })

  it('does not throw when sendEmail rejects', async () => {
    mockGetProfile.mockResolvedValue(ENABLED_PROFILE)
    mockSendEmail.mockRejectedValue(new Error('Mailgun down'))

    await expect(sendConnectionRequestEmail('u1', 'Jamie')).resolves.toBeUndefined()
  })
})

describe('sendConnectionAcceptedEmail', () => {
  it('sends email when notifications enabled', async () => {
    mockGetProfile.mockResolvedValue(ENABLED_PROFILE)
    mockSendEmail.mockResolvedValue(undefined)

    await sendConnectionAcceptedEmail('u1', 'Sam')

    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'alex@example.com',
        subject: expect.stringContaining('Sam'),
      })
    )
  })

  it('skips email when notifications disabled', async () => {
    mockGetProfile.mockResolvedValue({
      ...ENABLED_PROFILE,
      email_notifications_enabled: false,
    })

    await sendConnectionAcceptedEmail('u1', 'Sam')

    expect(mockSendEmail).not.toHaveBeenCalled()
  })

  it('does not throw when sendEmail rejects', async () => {
    mockGetProfile.mockResolvedValue(ENABLED_PROFILE)
    mockSendEmail.mockRejectedValue(new Error('Mailgun down'))

    await expect(sendConnectionAcceptedEmail('u1', 'Sam')).resolves.toBeUndefined()
  })
})

describe('sendRoundScheduledEmail', () => {
  it('sends email when notifications enabled', async () => {
    mockGetProfile.mockResolvedValue(ENABLED_PROFILE)
    mockSendEmail.mockResolvedValue(undefined)

    await sendRoundScheduledEmail('u1', '2026-06-15')

    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'alex@example.com',
        subject: expect.stringContaining('2026-06-15'),
      })
    )
  })

  it('skips email when notifications disabled', async () => {
    mockGetProfile.mockResolvedValue({
      ...ENABLED_PROFILE,
      email_notifications_enabled: false,
    })

    await sendRoundScheduledEmail('u1', '2026-06-15')

    expect(mockSendEmail).not.toHaveBeenCalled()
  })

  it('does not throw when sendEmail rejects', async () => {
    mockGetProfile.mockResolvedValue(ENABLED_PROFILE)
    mockSendEmail.mockRejectedValue(new Error('Mailgun down'))

    await expect(sendRoundScheduledEmail('u1', '2026-06-15')).resolves.toBeUndefined()
  })
})
