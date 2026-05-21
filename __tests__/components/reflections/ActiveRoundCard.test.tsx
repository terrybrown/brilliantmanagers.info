import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ActiveRoundCard } from '@/components/reflections/ActiveRoundCard'
import type { Round } from '@/lib/db/rounds'

vi.mock('@/components/reflections/CreateRoundModal', () => ({
  CreateRoundModal: ({ open }: { open: boolean }) =>
    open ? <div data-testid="create-round-modal" /> : null,
}))

const baseRound: Round = {
  id: 'r-1',
  user_id: 'u-1',
  status: 'in_progress',
  created_at: '2026-05-01T00:00:00Z',
  completed_at: null,
  title: 'Q2 2026',
  notes: null,
  remind_at: null,
}

describe('ActiveRoundCard — active state', () => {
  it('shows the round title', () => {
    render(
      <ActiveRoundCard
        inProgressRound={baseRound}
        scoredPillarCount={2}
        nextRoundTitle="Q3 2026"
      />
    )
    expect(screen.getByText('Q2 2026')).toBeInTheDocument()
  })

  it('shows scored pillar count', () => {
    render(
      <ActiveRoundCard
        inProgressRound={baseRound}
        scoredPillarCount={3}
        nextRoundTitle="Q3 2026"
      />
    )
    expect(screen.getByText(/3 of 5/)).toBeInTheDocument()
  })

  it('links to /scorecard with "Continue"', () => {
    render(
      <ActiveRoundCard
        inProgressRound={baseRound}
        scoredPillarCount={2}
        nextRoundTitle="Q3 2026"
      />
    )
    const link = screen.getByRole('link', { name: /continue/i })
    expect(link).toHaveAttribute('href', '/scorecard')
  })

  it('does not show modal in active state', () => {
    render(
      <ActiveRoundCard
        inProgressRound={baseRound}
        scoredPillarCount={2}
        nextRoundTitle="Q3 2026"
      />
    )
    expect(screen.queryByTestId('create-round-modal')).not.toBeInTheDocument()
  })

  it('shows full progress when all 5 pillars scored', () => {
    render(
      <ActiveRoundCard
        inProgressRound={baseRound}
        scoredPillarCount={5}
        nextRoundTitle="Q3 2026"
      />
    )
    expect(screen.getByText(/5 of 5/)).toBeInTheDocument()
  })
})

describe('ActiveRoundCard — empty state', () => {
  it('shows "Ready to reflect?" when no in-progress round', () => {
    render(
      <ActiveRoundCard
        inProgressRound={null}
        scoredPillarCount={0}
        nextRoundTitle="Q2 2026"
      />
    )
    expect(screen.getByText(/ready to reflect/i)).toBeInTheDocument()
  })

  it('opens CreateRoundModal when the start button is clicked', () => {
    render(
      <ActiveRoundCard
        inProgressRound={null}
        scoredPillarCount={0}
        nextRoundTitle="Q2 2026"
      />
    )
    expect(screen.queryByTestId('create-round-modal')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /start/i }))
    expect(screen.getByTestId('create-round-modal')).toBeInTheDocument()
  })
})
