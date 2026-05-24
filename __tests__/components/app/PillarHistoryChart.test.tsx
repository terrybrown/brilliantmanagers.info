import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { PillarHistoryChart } from '@/components/app/PillarHistoryChart'
import type { HistoryPoint } from '@/components/app/PillarHistoryChart'

class MockResizeObserver {
  observe = vi.fn(); unobserve = vi.fn(); disconnect = vi.fn()
}
global.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver

const TWO_POINTS: HistoryPoint[] = [
  {
    date: 'Jan 2026', overall: 3.0,
    self: 3.0, team: 3.0, strategy: 3.0, communications: 3.0, 'domain-expertise': 3.0,
  },
  {
    date: 'May 2026', overall: 3.5,
    self: 3.5, team: 3.5, strategy: 3.5, communications: 3.5, 'domain-expertise': 3.5,
    mgr_overall: 3.2, mgr_self: 3.0,
  },
]

describe('PillarHistoryChart', () => {
  it('renders null with fewer than 2 data points', () => {
    const { container } = render(<PillarHistoryChart data={[TWO_POINTS[0]]} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders without crashing', () => {
    const { container } = render(<PillarHistoryChart data={TWO_POINTS} />)
    expect(container.firstChild).toBeTruthy()
  })

  it('renders all six toggle buttons', () => {
    render(<PillarHistoryChart data={TWO_POINTS} />)
    expect(screen.getByRole('button', { name: 'Overall' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Self' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Team' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Strategy' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Comms' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Expertise' })).toBeInTheDocument()
  })

  it('renders Show Manager Score toggle', () => {
    render(<PillarHistoryChart data={TWO_POINTS} />)
    expect(screen.getByRole('button', { name: /show manager score/i })).toBeInTheDocument()
  })

  it('Overall is active by default, other pillars inactive', () => {
    render(<PillarHistoryChart data={TWO_POINTS} />)
    expect(screen.getByRole('button', { name: 'Overall' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Self' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('Show Manager Score is active by default', () => {
    render(<PillarHistoryChart data={TWO_POINTS} />)
    expect(screen.getByRole('button', { name: /show manager score/i })).toHaveAttribute('aria-pressed', 'true')
  })

  it('clicking an inactive pillar activates it', () => {
    render(<PillarHistoryChart data={TWO_POINTS} />)
    const self = screen.getByRole('button', { name: 'Self' })
    expect(self).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(self)
    expect(self).toHaveAttribute('aria-pressed', 'true')
  })

  it('clicking an active pillar deactivates it', () => {
    render(<PillarHistoryChart data={TWO_POINTS} />)
    const overall = screen.getByRole('button', { name: 'Overall' })
    expect(overall).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(overall)
    expect(overall).toHaveAttribute('aria-pressed', 'false')
  })

  it('clicking Show Manager Score toggles it off', () => {
    render(<PillarHistoryChart data={TWO_POINTS} />)
    const mgr = screen.getByRole('button', { name: /show manager score/i })
    fireEvent.click(mgr)
    expect(mgr).toHaveAttribute('aria-pressed', 'false')
  })
})
