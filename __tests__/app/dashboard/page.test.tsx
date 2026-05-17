import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import DashboardPage from '@/app/(app)/dashboard/page'

// Supabase server client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      }),
    },
  }),
}))

// DB functions — null round triggers the empty state branch
vi.mock('@/lib/db/rounds', () => ({
  getLatestCompleteRound: vi.fn().mockResolvedValue(null),
  getPreviousCompleteRound: vi.fn().mockResolvedValue(null),
  getInProgressRound: vi.fn().mockResolvedValue(null),
}))
vi.mock('@/lib/db/scores', () => ({
  getScoresForRound: vi.fn().mockResolvedValue([]),
}))
vi.mock('@/lib/db/manager-scores', () => ({
  getManagerScoresForDirectReport: vi.fn().mockResolvedValue([]),
}))
vi.mock('@/lib/db/development-plans', () => ({
  getPlansForUser: vi.fn().mockResolvedValue([]),
}))
vi.mock('@/lib/db/scheduled-rounds', () => ({
  getScheduledRound: vi.fn().mockResolvedValue(null),
}))
vi.mock('next/navigation', () => ({ redirect: vi.fn() }))

// DashboardTour (imported by the page) uses driver.js
vi.mock('driver.js', () => ({
  driver: vi.fn(() => ({ drive: vi.fn(), destroy: vi.fn() })),
}))
vi.mock('driver.js/dist/driver.css', () => ({}))

describe('DashboardPage — empty state', () => {
  it('renders the headline', async () => {
    render(await DashboardPage())
    expect(screen.getByRole('heading', { level: 1 })).toBeTruthy()
  })

  it('empty-state h1 uses the display font CSS variable', async () => {
    render(await DashboardPage())
    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading.style.fontFamily).toBe('var(--font-display)')
  })
})
