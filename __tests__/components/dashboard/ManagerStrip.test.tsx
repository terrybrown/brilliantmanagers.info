import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ManagerStrip, type EnrichedDRSummary } from '@/components/dashboard/ManagerStrip'

const BASE: EnrichedDRSummary = {
  userId: 'dr-1',
  name: 'Alice Smith',
  roundStatus: 'complete',
  lastScore: null,
  nextScheduledDate: null,
  managerScoringStatus: 'not_started',
  roundId: 'round-1',
  completedAt: '2026-05-01T00:00:00Z',
  pillarsScored: 0,
}

describe('ManagerStrip', () => {
  it('renders null when no summaries have a round', () => {
    const noRound = { ...BASE, roundId: null }
    const { container } = render(<ManagerStrip summaries={[noRound]} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders null when summaries array is empty', () => {
    const { container } = render(<ManagerStrip summaries={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders direct report name', () => {
    render(<ManagerStrip summaries={[BASE]} />)
    expect(screen.getByText('Alice Smith')).toBeInTheDocument()
  })

  it('shows "Start →" link to manager scoring page when not_started', () => {
    render(<ManagerStrip summaries={[BASE]} />)
    const link = screen.getByRole('link', { name: /start/i })
    expect(link).toHaveAttribute('href', '/manager/dr-1?roundId=round-1')
  })

  it('shows "Continue →" link when in_progress', () => {
    render(<ManagerStrip summaries={[{ ...BASE, managerScoringStatus: 'in_progress', pillarsScored: 2 }]} />)
    expect(screen.getByRole('link', { name: /continue/i })).toBeInTheDocument()
  })

  it('shows scored count when in_progress', () => {
    render(<ManagerStrip summaries={[{ ...BASE, managerScoringStatus: 'in_progress', pillarsScored: 3 }]} />)
    expect(screen.getByText(/3 of 5/i)).toBeInTheDocument()
  })

  it('shows fully scored card (no link) when complete', () => {
    render(<ManagerStrip summaries={[{ ...BASE, managerScoringStatus: 'complete', pillarsScored: 5 }]} />)
    expect(screen.getByText(/fully scored/i)).toBeInTheDocument()
    expect(screen.queryByRole('link')).toBeNull()
  })

  it('shows "N of M assessed" subtext', () => {
    const summaries = [
      { ...BASE, managerScoringStatus: 'complete' as const, pillarsScored: 5 },
      { ...BASE, userId: 'dr-2', name: 'Bob', roundId: 'round-2', managerScoringStatus: 'not_started' as const, pillarsScored: 0 },
    ]
    render(<ManagerStrip summaries={summaries} />)
    expect(screen.getByText(/1 of 2/i)).toBeInTheDocument()
  })

  it('omits DRs with no round from card grid', () => {
    const summaries = [
      BASE,
      { ...BASE, userId: 'dr-2', name: 'Charlie', roundId: null },
    ]
    render(<ManagerStrip summaries={summaries} />)
    expect(screen.getByText('Alice Smith')).toBeInTheDocument()
    expect(screen.queryByText('Charlie')).toBeNull()
  })
})
