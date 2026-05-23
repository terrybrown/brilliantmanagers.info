import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { TeamReflectionsSection } from '@/components/reflections/TeamReflectionsSection'
import type { TeamMemberSummary } from '@/lib/db/direct-reports'

type EnrichedMember = TeamMemberSummary & { name: string }

const COMPLETE_ROUND = {
  roundId: 'r1',
  roundLabel: 'Q1 2026',
  roundStatus: 'complete' as const,
  selfScore: 3.2,
  managerScore: 3.8,
  managerScoringStatus: 'complete' as const,
  pillarsScored: 5,
  completedAt: '2026-03-15T12:00:00Z',
}

const PENDING_ROUND = {
  roundId: 'r2',
  roundLabel: 'Q2 2026',
  roundStatus: 'complete' as const,
  selfScore: 3.5,
  managerScore: null,
  managerScoringStatus: 'not_started' as const,
  pillarsScored: 0,
  completedAt: '2026-06-01T12:00:00Z',
}

const IN_PROGRESS_ROUND = {
  roundId: 'r3',
  roundLabel: 'Q3 2026',
  roundStatus: 'in_progress' as const,
  selfScore: null,
  managerScore: null,
  managerScoringStatus: 'in_progress' as const,
  pillarsScored: 2,
  completedAt: null,
}

const ALICE: EnrichedMember = {
  directReportId: 'dr-1',
  name: 'Alice',
  rounds: [PENDING_ROUND, COMPLETE_ROUND],
  pendingScoringCount: 1,
}

describe('TeamReflectionsSection', () => {
  it('renders null when summaries is empty', () => {
    const { container } = render(<TeamReflectionsSection summaries={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders DR name', () => {
    render(<TeamReflectionsSection summaries={[ALICE]} />)
    expect(screen.getByText('Alice')).toBeInTheDocument()
  })

  it('renders round label for each round', () => {
    render(<TeamReflectionsSection summaries={[ALICE]} />)
    expect(screen.getByText('Q2 2026')).toBeInTheDocument()
    expect(screen.getByText('Q1 2026')).toBeInTheDocument()
  })

  it('shows self score for complete rounds', () => {
    render(<TeamReflectionsSection summaries={[ALICE]} />)
    expect(screen.getByText('3.2')).toBeInTheDocument()
  })

  it('shows — for self score on non-complete rounds', () => {
    const member: EnrichedMember = { ...ALICE, rounds: [IN_PROGRESS_ROUND], pendingScoringCount: 1 }
    render(<TeamReflectionsSection summaries={[member]} />)
    expect(screen.getAllByText('—').length).toBeGreaterThan(0)
  })

  it('shows "Score →" link for not_started manager scoring', () => {
    render(<TeamReflectionsSection summaries={[ALICE]} />)
    const scoreLinks = screen.getAllByRole('link', { name: /score/i })
    expect(scoreLinks.length).toBeGreaterThan(0)
    expect(scoreLinks[0]).toHaveAttribute('href', expect.stringContaining('/manager/dr-1?roundId=r2'))
  })

  it('shows "N/5 pillars" for in_progress manager scoring', () => {
    const member: EnrichedMember = {
      ...ALICE,
      rounds: [{ ...IN_PROGRESS_ROUND, managerScoringStatus: 'in_progress', pillarsScored: 2 }],
      pendingScoringCount: 1,
    }
    render(<TeamReflectionsSection summaries={[member]} />)
    expect(screen.getByText(/2\/5/)).toBeInTheDocument()
  })

  it('shows manager score when complete', () => {
    render(<TeamReflectionsSection summaries={[ALICE]} />)
    expect(screen.getByText('3.8')).toBeInTheDocument()
  })

  it('shows pending badge count in card header', () => {
    render(<TeamReflectionsSection summaries={[ALICE]} />)
    expect(screen.getByText(/1.*scoring/i)).toBeInTheDocument()
  })
})
