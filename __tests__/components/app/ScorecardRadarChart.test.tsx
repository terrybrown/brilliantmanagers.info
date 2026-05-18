import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { ScorecardPillarTick } from '@/components/app/ScorecardRadarChart'

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

describe('ScorecardPillarTick', () => {
  it('renders a single text element for single-word labels', () => {
    const { container } = render(
      <svg>
        <ScorecardPillarTick x={50} y={50} payload={{ value: 'Self' }} textAnchor="middle" />
      </svg>
    )
    expect(container.querySelectorAll('tspan')).toHaveLength(0)
    expect(container.querySelector('text')).toHaveTextContent('Self')
  })

  it('renders two tspan lines for "Domain Expertise"', () => {
    const { container } = render(
      <svg>
        <ScorecardPillarTick x={50} y={50} payload={{ value: 'Domain Expertise' }} textAnchor="end" />
      </svg>
    )
    const tspans = container.querySelectorAll('tspan')
    expect(tspans).toHaveLength(2)
    expect(tspans[0]).toHaveTextContent('Domain')
    expect(tspans[1]).toHaveTextContent('Expertise')
  })

  it('shows pointer cursor when onPillarClick is provided', () => {
    const { container } = render(
      <svg>
        <ScorecardPillarTick
          x={50}
          y={50}
          payload={{ value: 'Self' }}
          textAnchor="middle"
          onPillarClick={vi.fn()}
        />
      </svg>
    )
    const g = container.querySelector('g')!
    expect(g.getAttribute('style')).toContain('pointer')
  })
})
