import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ReflectionsTrendChart } from '@/components/reflections/ReflectionsTrendChart'
import type { TrendPoint } from '@/lib/reflections'

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  LineChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="line-chart">{children}</div>
  ),
  Line: ({ dataKey, name }: { dataKey: string; name: string }) => (
    <div data-testid={`line-${dataKey}`} data-name={name} />
  ),
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
}))

const mockPoints: TrendPoint[] = [
  {
    label: 'Q1 2026',
    overall: 2.8,
    self: 3.0,
    team: 2.5,
    strategy: 3.0,
    communications: 2.8,
    'domain-expertise': 2.7,
  },
  {
    label: 'Q2 2026',
    overall: 3.4,
    self: 3.5,
    team: 3.2,
    strategy: 3.5,
    communications: 3.4,
    'domain-expertise': 3.4,
    mgr_overall: 3.8,
    mgr_self: 4.0,
    mgr_team: 3.5,
    mgr_strategy: 3.8,
    mgr_communications: 3.8,
    'mgr_domain-expertise': 3.7,
  },
]

describe('ReflectionsTrendChart', () => {
  it('renders nothing when data is empty', () => {
    const { container } = render(<ReflectionsTrendChart data={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders the chart container when data has one or more points', () => {
    render(<ReflectionsTrendChart data={mockPoints} />)
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument()
  })

  it('shows the Overall tab selected by default', () => {
    render(<ReflectionsTrendChart data={mockPoints} />)
    const overallTab = screen.getByRole('button', { name: /overall/i })
    expect(overallTab).toBeInTheDocument()
  })

  it('renders tab buttons for each pillar', () => {
    render(<ReflectionsTrendChart data={mockPoints} />)
    expect(screen.getByRole('button', { name: /self/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /team/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /strategy/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /comms/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /expertise/i })).toBeInTheDocument()
  })

  it('renders the overall self line', () => {
    render(<ReflectionsTrendChart data={mockPoints} />)
    expect(screen.getByTestId('line-overall')).toBeInTheDocument()
  })

  it('renders the manager overall line when mgr data is present', () => {
    render(<ReflectionsTrendChart data={mockPoints} />)
    expect(screen.getByTestId('line-mgr_overall')).toBeInTheDocument()
  })

  it('switches to self lines when Self tab is clicked', () => {
    render(<ReflectionsTrendChart data={mockPoints} />)
    fireEvent.click(screen.getByRole('button', { name: /self/i }))
    expect(screen.getByTestId('line-self')).toBeInTheDocument()
    expect(screen.queryByTestId('line-overall')).not.toBeInTheDocument()
  })
})
