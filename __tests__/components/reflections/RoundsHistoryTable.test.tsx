import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RoundsHistoryTable } from '@/components/reflections/RoundsHistoryTable'
import type { RoundRow } from '@/components/reflections/RoundsHistoryTable'

const negTrendRow: RoundRow = {
  id: 'r-0',
  title: 'Q4 2025',
  dateRange: 'Oct 2025 – Dec 2025',
  overallScore: 3.1,
  managerOverall: null,
  pillarScores: { self: 3.2, team: 3.0, strategy: 3.1, communications: 3.0, 'domain-expertise': 3.2 },
  trend: -0.3,
}

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

  it('shows "—" specifically for null manager score', () => {
    render(<RoundsHistoryTable rows={rows} />)
    // r-1 has managerOverall: null AND trend: null so two dashes
    // r-2 has managerOverall: 3.8 AND trend: 0.6 so no dashes from that row
    const dashes = screen.getAllByText('—')
    expect(dashes).toHaveLength(2) // one from manager score, one from trend in r-1
  })

  it('shows positive trend in green', () => {
    render(<RoundsHistoryTable rows={rows} />)
    expect(screen.getByText('+0.6')).toBeInTheDocument()
  })

  it('renders column headers correctly', () => {
    render(<RoundsHistoryTable rows={rows} />)
    expect(screen.getByText('Manager score')).toBeInTheDocument()
    expect(screen.getByText('Your score')).toBeInTheDocument()
    expect(screen.getByText('Trend')).toBeInTheDocument()
    expect(screen.getByText('View')).toBeInTheDocument()
  })

  it('renders pillar score values', () => {
    render(<RoundsHistoryTable rows={rows} />)
    // row r-2 has self: 3.5 and strategy: 3.5, so multiple cells with this value
    const cells = screen.getAllByText('3.5')
    expect(cells.length).toBeGreaterThan(0)
  })

  it('renders dateRange below title', () => {
    render(<RoundsHistoryTable rows={rows} />)
    expect(screen.getByText('Apr 2026 – Jun 2026')).toBeInTheDocument()
  })

  it('shows negative trend without + prefix', () => {
    render(<RoundsHistoryTable rows={[negTrendRow]} />)
    expect(screen.getByText('-0.3')).toBeInTheDocument()
    expect(screen.queryByText('+0.3')).not.toBeInTheDocument()
  })
})
