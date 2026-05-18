import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ScheduleWidget } from '@/components/app/ScheduleWidget'

vi.mock('@/app/(app)/dashboard/actions', () => ({
  setScheduledRoundAction: vi.fn(),
  cancelScheduledRoundAction: vi.fn(),
}))

vi.mock('@/lib/countdown', () => ({
  daysUntil: vi.fn().mockReturnValue(5),
  countdownLabel: vi.fn().mockReturnValue('in 5 days'),
  googleCalendarUrl: vi.fn().mockReturnValue('https://calendar.google.com/fake'),
}))

describe('ScheduleWidget', () => {
  it('shows "Start new round" link when showStartNewRound is true and no scheduled date', () => {
    render(<ScheduleWidget scheduled={null} showStartNewRound={true} />)
    const link = screen.getByRole('link', { name: /start new round/i })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/scorecard')
  })

  it('does not show "Start new round" link when showStartNewRound is false', () => {
    render(<ScheduleWidget scheduled={null} showStartNewRound={false} />)
    expect(screen.queryByRole('link', { name: /start new round/i })).not.toBeInTheDocument()
  })

  it('shows "Start new round" link when showStartNewRound is true and a date is scheduled', () => {
    const scheduled = {
      id: '1',
      user_id: 'u1',
      scheduled_date: '2026-08-01',
      created_at: '2026-05-01',
    }
    render(<ScheduleWidget scheduled={scheduled} showStartNewRound={true} />)
    const link = screen.getByRole('link', { name: /start new round/i })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/scorecard')
  })
})
