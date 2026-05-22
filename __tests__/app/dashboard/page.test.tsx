import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import DashboardPage from '@/app/(app)/dashboard/page'
import { getAllCompleteRoundsWithScores, getInProgressRound } from '@/lib/db/rounds'
import { getScoresForRound } from '@/lib/db/scores'
import { getConnectionsForUser } from '@/lib/db/connections'

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

vi.mock('@/lib/db/rounds', () => ({
  getAllCompleteRoundsWithScores: vi.fn().mockResolvedValue([]),
  getInProgressRound: vi.fn().mockResolvedValue(null),
}))
vi.mock('@/lib/db/scores', () => ({
  getScoresForRound: vi.fn().mockResolvedValue([]),
}))
vi.mock('@/lib/db/manager-scores', () => ({
  getManagerScoresForDirectReport: vi.fn().mockResolvedValue([]),
  getManagerScoresForAllRounds: vi.fn().mockResolvedValue({}),
}))
vi.mock('@/lib/db/development-plans', () => ({
  getPlansForUser: vi.fn().mockResolvedValue([]),
}))
vi.mock('@/lib/db/connections', () => ({
  getConnectionsForUser: vi.fn().mockResolvedValue({ asManager: [], asDirectReport: [] }),
}))
vi.mock('@/lib/db/direct-reports', () => ({
  getDirectReportRoundSummaries: vi.fn().mockResolvedValue({}),
}))
vi.mock('@/lib/db/profiles', () => ({
  getProfile: vi.fn().mockResolvedValue(null),
}))
vi.mock('next/navigation', () => ({ redirect: vi.fn() }))

vi.mock('driver.js', () => ({
  driver: vi.fn(() => ({ drive: vi.fn(), destroy: vi.fn() })),
}))
vi.mock('driver.js/dist/driver.css', () => ({}))

vi.mock('@/components/dashboard/DashboardResults', () => ({
  DashboardResults: (props: {
    scoredPillarCount: number
    inProgressRound: unknown
    nextRoundTitle: string
  }) => (
    <div
      data-testid="dashboard-results"
      data-scored={props.scoredPillarCount}
      data-has-round={String(props.inProgressRound !== null)}
      data-title={props.nextRoundTitle}
    />
  ),
}))

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

describe('DashboardPage — with completed rounds', () => {
  it('renders DashboardResults when a completed round exists', async () => {
    vi.mocked(getAllCompleteRoundsWithScores).mockResolvedValueOnce([
      {
        round: {
          id: 'round-1',
          user_id: 'user-123',
          status: 'complete' as const,
          created_at: '2026-01-01T00:00:00Z',
          completed_at: '2026-03-01T00:00:00Z',
          title: 'Q1 2026',
          notes: null,
          remind_at: null,
        },
        scores: [
          {
            id: 's1',
            round_id: 'round-1',
            user_id: 'user-123',
            skill_key: 'self-resilience',
            pillar: 'self',
            level: 'Proficient',
          },
        ],
      },
    ])
    vi.mocked(getInProgressRound).mockResolvedValueOnce({
      id: 'round-2',
      user_id: 'user-123',
      status: 'in_progress' as const,
      created_at: '2026-04-01T00:00:00Z',
      completed_at: null,
      title: 'Q2 2026',
      notes: null,
      remind_at: null,
    })
    vi.mocked(getScoresForRound).mockResolvedValueOnce([
      {
        id: 's2',
        round_id: 'round-2',
        user_id: 'user-123',
        skill_key: 'self-resilience',
        pillar: 'self',
        level: 'Basic',
      },
    ])

    render(await DashboardPage())
    expect(screen.getByTestId('dashboard-results')).toBeInTheDocument()
  })

  it('passes scoredPillarCount = 1 when in-progress scores cover one pillar', async () => {
    vi.mocked(getAllCompleteRoundsWithScores).mockResolvedValueOnce([
      {
        round: {
          id: 'round-1',
          user_id: 'user-123',
          status: 'complete' as const,
          created_at: '2026-01-01T00:00:00Z',
          completed_at: '2026-03-01T00:00:00Z',
          title: 'Q1 2026',
          notes: null,
          remind_at: null,
        },
        scores: [
          {
            id: 's1',
            round_id: 'round-1',
            user_id: 'user-123',
            skill_key: 'self-resilience',
            pillar: 'self',
            level: 'Proficient',
          },
        ],
      },
    ])
    vi.mocked(getInProgressRound).mockResolvedValueOnce({
      id: 'round-2',
      user_id: 'user-123',
      status: 'in_progress' as const,
      created_at: '2026-04-01T00:00:00Z',
      completed_at: null,
      title: 'Q2 2026',
      notes: null,
      remind_at: null,
    })
    vi.mocked(getScoresForRound).mockResolvedValueOnce([
      {
        id: 's2',
        round_id: 'round-2',
        user_id: 'user-123',
        skill_key: 'self-resilience',
        pillar: 'self',
        level: 'Basic',
      },
      {
        id: 's3',
        round_id: 'round-2',
        user_id: 'user-123',
        skill_key: 'self-growth-mindset',
        pillar: 'self',
        level: 'Basic',
      },
    ])

    render(await DashboardPage())
    // Both scores are in the 'self' pillar → Set has 1 unique pillar
    expect(screen.getByTestId('dashboard-results')).toHaveAttribute('data-scored', '1')
  })

  it('passes inProgressRound to DashboardResults', async () => {
    vi.mocked(getAllCompleteRoundsWithScores).mockResolvedValueOnce([
      {
        round: {
          id: 'round-1',
          user_id: 'user-123',
          status: 'complete' as const,
          created_at: '2026-01-01T00:00:00Z',
          completed_at: '2026-03-01T00:00:00Z',
          title: 'Q1 2026',
          notes: null,
          remind_at: null,
        },
        scores: [
          {
            id: 's1',
            round_id: 'round-1',
            user_id: 'user-123',
            skill_key: 'self-resilience',
            pillar: 'self',
            level: 'Proficient',
          },
        ],
      },
    ])
    vi.mocked(getInProgressRound).mockResolvedValueOnce({
      id: 'round-2',
      user_id: 'user-123',
      status: 'in_progress' as const,
      created_at: '2026-04-01T00:00:00Z',
      completed_at: null,
      title: 'Q2 2026',
      notes: null,
      remind_at: null,
    })
    vi.mocked(getScoresForRound).mockResolvedValueOnce([])

    render(await DashboardPage())
    expect(screen.getByTestId('dashboard-results')).toHaveAttribute('data-has-round', 'true')
  })
})
