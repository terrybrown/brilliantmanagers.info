import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ManagerStrip, type EnrichedDRSummary } from '@/components/dashboard/ManagerStrip'

const BASE: EnrichedDRSummary = {
  userId: 'dr-1',
  name: 'Alice Smith',
  roundStatus: 'in_progress',
  lastScore: null,
  nextScheduledDate: null,
  managerScoringStatus: 'not_started',
  roundId: 'round-1',
  completedAt: null,
  pillarsScored: 0,
}

describe('ManagerStrip', () => {
  it('renders null when summaries is empty', () => {
    const { container } = render(<ManagerStrip summaries={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders direct report name', () => {
    render(<ManagerStrip summaries={[BASE]} />)
    expect(screen.getByText('Alice Smith')).toBeInTheDocument()
  })

  it('shows "Score now" link to manager page with roundId when not_started', () => {
    render(<ManagerStrip summaries={[BASE]} />)
    const link = screen.getByRole('link', { name: /score now/i })
    expect(link).toHaveAttribute('href', '/manager/dr-1?roundId=round-1')
  })

  it('shows "Continue scoring" link when in_progress', () => {
    render(<ManagerStrip summaries={[{ ...BASE, managerScoringStatus: 'in_progress' }]} />)
    expect(screen.getByRole('link', { name: /continue scoring/i })).toBeInTheDocument()
  })

  it('shows "Complete" text (no link) when complete', () => {
    render(<ManagerStrip summaries={[{ ...BASE, managerScoringStatus: 'complete' }]} />)
    expect(screen.getByText('Complete')).toBeInTheDocument()
    expect(screen.queryByRole('link')).toBeNull()
  })

  it('links to manager page without roundId when roundId is null', () => {
    render(<ManagerStrip summaries={[{ ...BASE, roundId: null }]} />)
    expect(screen.getByRole('link')).toHaveAttribute('href', '/manager/dr-1')
  })
})
