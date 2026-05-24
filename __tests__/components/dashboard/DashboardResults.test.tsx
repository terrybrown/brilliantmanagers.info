import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { DashboardResults } from '@/components/dashboard/DashboardResults'

vi.mock('@/components/app/ScorecardRadarChart', () => ({
  ScorecardRadarChart: () => <div data-testid="radar-chart" />,
}))
vi.mock('@/components/app/PillarAccordion', () => ({
  PillarAccordion: () => <div data-testid="pillar-accordion" />,
}))
vi.mock('@/components/app/PillarHistoryChart', () => ({
  PillarHistoryChart: () => <div data-testid="history-chart" />,
}))
vi.mock('@/components/reflections/ActiveRoundCard', () => ({
  ActiveRoundCard: () => <div data-testid="active-round-card" />,
}))
vi.mock('@/components/app/GrowthSummaryCard', () => ({
  GrowthSummaryCard: () => <div data-testid="growth-summary" />,
}))
vi.mock('@/components/app/CheckInNudgeCard', () => ({
  CheckInNudgeCard: () => <div data-testid="checkin-nudge" />,
}))
vi.mock('@/components/people/InviteManagerModal', () => ({
  InviteManagerModal: () => <div data-testid="invite-manager" />,
}))
vi.mock('@/components/app/ScoreSparkline', () => ({
  ScoreSparkline: () => <div data-testid="score-sparkline" />,
}))

const BASE: Parameters<typeof DashboardResults>[0] = {
  pillarScoresForRadar: [],
  hasManagerScores: false,
  pillarsForAccordion: [],
  historyData: [],
  overallAvg: 3.5,
  roundDate: 'May 2026',
  inProgressRound: null,
  scoredPillarCount: 0,
  nextRoundTitle: 'Q3 2026',
  plans: [],
  overdueCount: 0,
}

describe('DashboardResults', () => {
  it('renders overall self score', () => {
    render(<DashboardResults {...BASE} />)
    expect(screen.getByText('3.5')).toBeInTheDocument()
    expect(screen.getByText('Overall score')).toBeInTheDocument()
  })

  it('shows manager score box when overallManagerAvg is provided', () => {
    render(<DashboardResults {...BASE} overallManagerAvg={3.2} />)
    expect(screen.getByText('3.2')).toBeInTheDocument()
    expect(screen.getByText('Manager score')).toBeInTheDocument()
  })

  it('hides manager score box when overallManagerAvg is undefined', () => {
    render(<DashboardResults {...BASE} />)
    expect(screen.queryByText('Manager score')).toBeNull()
  })

  it('does not render ScoreSparkline', () => {
    render(<DashboardResults {...BASE} />)
    expect(screen.queryByTestId('score-sparkline')).toBeNull()
  })

  it('hides action cards when isReadOnly is true', () => {
    render(<DashboardResults {...BASE} isReadOnly />)
    expect(screen.queryByTestId('active-round-card')).toBeNull()
    expect(screen.queryByTestId('growth-summary')).toBeNull()
    expect(screen.queryByTestId('checkin-nudge')).toBeNull()
  })

  it('shows action cards when isReadOnly is not set', () => {
    render(<DashboardResults {...BASE} />)
    expect(screen.getByTestId('active-round-card')).toBeInTheDocument()
    expect(screen.getByTestId('growth-summary')).toBeInTheDocument()
  })
})
