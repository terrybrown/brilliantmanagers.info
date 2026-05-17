import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ScheduleWidget } from '../ScheduleWidget'
import type { ScheduledRound } from '@/lib/db/scheduled-rounds'

// Server actions use 'use server' which cannot run in jsdom — mock them out
vi.mock('@/app/(app)/dashboard/actions', () => ({
  setScheduledRoundAction: vi.fn(),
  cancelScheduledRoundAction: vi.fn(),
}))

describe('ScheduleWidget', () => {
  it('shows the schedule form when no round is scheduled', () => {
    render(<ScheduleWidget scheduled={null} />)
    expect(screen.getByText(/Schedule your next reflection/i)).toBeInTheDocument()
  })

  it('shows a date input when not scheduled', () => {
    render(<ScheduleWidget scheduled={null} />)
    expect(screen.getByLabelText(/reflection date/i)).toBeInTheDocument()
  })

  it('shows countdown when a future date is scheduled', () => {
    const scheduled: ScheduledRound = {
      id: '1',
      user_id: 'u1',
      scheduled_date: '2099-12-31',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    render(<ScheduleWidget scheduled={scheduled} />)
    expect(screen.getByText(/in \d+ days/i)).toBeInTheDocument()
  })

  it('shows Google Calendar link when scheduled', () => {
    const scheduled: ScheduledRound = {
      id: '1',
      user_id: 'u1',
      scheduled_date: '2099-12-31',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    render(<ScheduleWidget scheduled={scheduled} />)
    expect(screen.getByText(/Add to Google Calendar/i)).toBeInTheDocument()
  })

  it('shows Download .ics link when scheduled', () => {
    const scheduled: ScheduledRound = {
      id: '1',
      user_id: 'u1',
      scheduled_date: '2099-12-31',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    render(<ScheduleWidget scheduled={scheduled} />)
    expect(screen.getByText(/Download \.ics/i)).toBeInTheDocument()
  })
})
