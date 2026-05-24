import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import DrViewPage from '@/app/(app)/dr/[userId]/page'
import { getAllCompleteRoundsWithScores } from '@/lib/db/rounds'

const queryBuilder = vi.hoisted(() => ({
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'conn-1' }, error: null }),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'mgr-1' } }, error: null }),
    },
    from: vi.fn().mockReturnValue(queryBuilder),
  }),
}))

vi.mock('@/lib/db/rounds', () => ({
  getAllCompleteRoundsWithScores: vi.fn().mockResolvedValue([]),
}))

vi.mock('@/lib/db/manager-scores', () => ({
  getManagerScoresForRound: vi.fn().mockResolvedValue([]),
  getManagerScoresForAllRounds: vi.fn().mockResolvedValue({}),
}))

vi.mock('@/lib/db/profiles', () => ({
  getProfile: vi.fn().mockResolvedValue({ id: 'dr-1', display_name: 'Alice Smith', email: 'alice@co.com', avatar_path: null }),
}))

vi.mock('@/components/dashboard/DashboardResults', () => ({
  DashboardResults: (props: { isReadOnly?: boolean }) => (
    <div data-testid="dashboard-results" data-readonly={String(props.isReadOnly ?? false)} />
  ),
}))

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
  notFound: vi.fn(() => { throw new Error('NEXT_NOT_FOUND') }),
}))

const PAGE_PARAMS = {
  params: Promise.resolve({ userId: 'dr-1' }),
  searchParams: Promise.resolve({}),
}

describe('DrViewPage', () => {
  it('shows empty state with back link when no completed rounds', async () => {
    render(await DrViewPage(PAGE_PARAMS))
    expect(screen.getByText(/hasn't completed a round/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /← Dashboard/i })).toHaveAttribute('href', '/dashboard')
  })

  it('renders DashboardResults with isReadOnly when rounds exist', async () => {
    vi.mocked(getAllCompleteRoundsWithScores).mockResolvedValueOnce([
      {
        round: {
          id: 'round-1', user_id: 'dr-1', status: 'complete' as const,
          created_at: '2026-01-01T00:00:00Z', completed_at: '2026-03-01T00:00:00Z',
          title: 'Q1 2026', notes: null, remind_at: null,
        },
        scores: [
          { id: 's1', round_id: 'round-1', user_id: 'dr-1', skill_key: 'self-resilience', pillar: 'self', level: 'Proficient' },
        ],
      },
    ])
    render(await DrViewPage(PAGE_PARAMS))
    const results = screen.getByTestId('dashboard-results')
    expect(results).toBeInTheDocument()
    expect(results).toHaveAttribute('data-readonly', 'true')
  })

  it('shows DR name in the heading', async () => {
    vi.mocked(getAllCompleteRoundsWithScores).mockResolvedValueOnce([
      {
        round: {
          id: 'round-1', user_id: 'dr-1', status: 'complete' as const,
          created_at: '2026-01-01T00:00:00Z', completed_at: '2026-03-01T00:00:00Z',
          title: 'Q1 2026', notes: null, remind_at: null,
        },
        scores: [],
      },
    ])
    render(await DrViewPage(PAGE_PARAMS))
    expect(screen.getByText('Alice Smith')).toBeInTheDocument()
  })
})
