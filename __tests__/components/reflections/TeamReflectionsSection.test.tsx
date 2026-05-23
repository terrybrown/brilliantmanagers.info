import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { TeamReflectionsSection } from '@/components/reflections/TeamReflectionsSection'
import type { TeamMemberSummary } from '@/lib/db/direct-reports'

type EnrichedSummary = TeamMemberSummary & { name: string }

const ALICE: EnrichedSummary = {
  directReportId: 'dr-1',
  name: 'Alice Smith',
  pendingScoringCount: 1,
  rounds: [
    {
      roundId: 'round-1',
      roundLabel: 'Q2 2026',
      roundStatus: 'complete',
      managerScoringStatus: 'not_started',
      selfScore: null,
      managerScore: null,
      pillarsScored: 0,
      completedAt: '2026-05-20T00:00:00Z',
    },
  ],
}

describe('TeamReflectionsSection', () => {
  it('renders null when summaries is empty', () => {
    const { container } = render(<TeamReflectionsSection summaries={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders direct report name', () => {
    render(<TeamReflectionsSection summaries={[ALICE]} />)
    expect(screen.getByText('Alice Smith')).toBeInTheDocument()
  })

  it('links to manager page with roundId for Score now CTA', () => {
    render(<TeamReflectionsSection summaries={[ALICE]} />)
    expect(screen.getByRole('link', { name: /score now/i }))
      .toHaveAttribute('href', '/manager/dr-1?roundId=round-1')
  })

  it('shows Continue scoring link when in_progress', () => {
    const inProgress: EnrichedSummary = {
      ...ALICE,
      rounds: [{ ...ALICE.rounds[0], managerScoringStatus: 'in_progress' }],
    }
    render(<TeamReflectionsSection summaries={[inProgress]} />)
    expect(screen.getByRole('link', { name: /continue scoring/i })).toBeInTheDocument()
  })

  it('shows no CTA link when scoring is complete', () => {
    const complete: EnrichedSummary = {
      ...ALICE,
      pendingScoringCount: 0,
      rounds: [{ ...ALICE.rounds[0], managerScoringStatus: 'complete' }],
    }
    render(<TeamReflectionsSection summaries={[complete]} />)
    expect(screen.queryByRole('link')).toBeNull()
  })
})
