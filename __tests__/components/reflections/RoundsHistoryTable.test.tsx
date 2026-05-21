import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RoundsHistoryTable } from '@/components/reflections/RoundsHistoryTable'
import type { RoundRow } from '@/components/reflections/RoundsHistoryTable'

const rows: RoundRow[] = [
  {
    id: 'r-2',
    title: 'Q2 2026',
    dateRange: 'Apr 2026 – Jun 2026',
    overallScore: 3.4,
    managerOverall: 3.8,
    pillarScores: { self: 3.5, team: 3.2, strategy: 3.5, communications: 3.4, 'domain-expertise': 3.4 },
    trend: 0.6,
  },
  {
    id: 'r-1',
    title: 'Q1 2026',
    dateRange: 'Jan 2026 – Mar 2026',
    overallScore: 2.8,
    managerOverall: null,
    pillarScores: { self: 3.0, team: 2.5, strategy: 3.0, communications: 2.8, 'domain-expertise': 2.7 },
    trend: null,
  },
]

describe('RoundsHistoryTable', () => {
  it('renders a row for each round', () => {
    render(<RoundsHistoryTable rows={rows} />)
    expect(screen.getByText('Q2 2026')).toBeInTheDocument()
    expect(screen.getByText('Q1 2026')).toBeInTheDocument()
  })

  it('renders "View" links pointing to /reflections/[id]', () => {
    render(<RoundsHistoryTable rows={rows} />)
    const links = screen.getAllByRole('link', { name: /view/i })
    expect(links).toHaveLength(2)
    expect(links[0]).toHaveAttribute('href', '/reflections/r-2')
    expect(links[1]).toHaveAttribute('href', '/reflections/r-1')
  })

  it('shows manager overall score when present', () => {
    render(<RoundsHistoryTable rows={rows} />)
    expect(screen.getByText('3.8')).toBeInTheDocument()
  })

  it('shows "—" for missing manager score', () => {
    render(<RoundsHistoryTable rows={rows} />)
    const dashes = screen.getAllByText('—')
    expect(dashes.length).toBeGreaterThan(0)
  })

  it('shows positive trend in green', () => {
    render(<RoundsHistoryTable rows={rows} />)
    expect(screen.getByText('+0.6')).toBeInTheDocument()
  })
})
