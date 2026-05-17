import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import DashboardPage from '@/app/(app)/dashboard/page'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
  }),
}))
vi.mock('@/lib/db/rounds', () => ({
  getLatestCompleteRound: vi.fn().mockResolvedValue(null),
  getPreviousCompleteRound: vi.fn().mockResolvedValue(null),
  getInProgressRound: vi.fn().mockResolvedValue(null),
}))
vi.mock('@/lib/db/scores', () => ({ getScoresForRound: vi.fn().mockResolvedValue([]) }))
vi.mock('@/lib/db/manager-scores', () => ({ getManagerScoresForDirectReport: vi.fn().mockResolvedValue([]) }))
vi.mock('@/lib/db/development-plans', () => ({ getPlansForUser: vi.fn().mockResolvedValue([]) }))
vi.mock('@/lib/db/scheduled-rounds', () => ({ getScheduledRound: vi.fn().mockResolvedValue(null) }))
vi.mock('next/navigation', () => ({ redirect: vi.fn() }))
vi.mock('driver.js', () => ({ driver: vi.fn(() => ({ drive: vi.fn() })) }))
vi.mock('driver.js/dist/driver.css', () => ({}))

describe('DashboardPage — empty state', () => {
  it('empty-state heading uses the display font CSS variable', async () => {
    const Page = await DashboardPage()
    const { container } = render(Page)
    const heading = container.querySelector('h1')
    expect(heading).not.toBeNull()
    expect(heading!.style.fontFamily).toBe('var(--font-display)')
  })
})
