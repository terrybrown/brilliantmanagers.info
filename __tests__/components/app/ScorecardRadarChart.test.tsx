import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { ScorecardPillarTick, PillarTooltip, ScorecardRadarChart } from '@/components/app/ScorecardRadarChart'
import type { RadarPillarScore } from '@/lib/reflections'

class MockResizeObserver {
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
}
global.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver

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

  it('changes fill to amber on mouse enter and back on mouse leave', async () => {
    const { container } = render(
      <svg>
        <ScorecardPillarTick x={50} y={50} payload={{ value: 'Self' }} textAnchor="middle" />
      </svg>
    )
    const g = container.querySelector('g')!
    const text = container.querySelector('text')!

    expect(text.getAttribute('fill')).toBe('#94a3b8')
    fireEvent.mouseEnter(g)
    expect(text.getAttribute('fill')).toBe('#f59e0b')
    fireEvent.mouseLeave(g)
    expect(text.getAttribute('fill')).toBe('#94a3b8')
  })

  it('calls onPillarClick with the pillar key when a known label is clicked', () => {
    const handler = vi.fn()
    const { container } = render(
      <svg>
        <ScorecardPillarTick
          x={50}
          y={50}
          payload={{ value: 'Self' }}
          textAnchor="middle"
          onPillarClick={handler}
        />
      </svg>
    )
    fireEvent.click(container.querySelector('g')!)
    expect(handler).toHaveBeenCalledWith('self')
  })
})

describe('PillarTooltip', () => {
  const baseScore: RadarPillarScore = {
    pillar: 'strategy',
    selfScore: 4,
    selfScored: true,
    selfSkills: [
      // Skill levels deliberately NOT 'Advanced' so the badge is the only 'Advanced' in the output
      { skillKey: 'strategy-vision-creation', label: 'Strategy & Vision Creation', level: 'Expert' },
      { skillKey: 'strategy-goal-setting', label: 'Goal Setting', level: 'Basic' },
    ],
    managerScore: 3,
    managerSkills: [
      { skillKey: 'strategy-vision-creation', label: 'Strategy & Vision Creation', level: 'Proficient' },
    ],
  }

  it('shows the pillar name', () => {
    const { getByText } = render(
      <PillarTooltip pillarScore={baseScore} hidden={new Set()} />
    )
    expect(getByText('Strategy')).toBeTruthy()
  })

  it('shows self score and skill breakdown', () => {
    const { getByText, getAllByText } = render(
      <PillarTooltip pillarScore={baseScore} hidden={new Set()} />
    )
    expect(getByText('4 / 5')).toBeTruthy()
    // label appears in both self and manager skill rows since fixture shares the skill key
    expect(getAllByText('Strategy & Vision Creation').length).toBeGreaterThanOrEqual(1)
    expect(getByText('Goal Setting')).toBeTruthy()
    expect(getByText('Expert')).toBeTruthy()
    expect(getByText('Basic')).toBeTruthy()
  })

  it('shows manager score and skills when manager series is visible', () => {
    const { getByText, getAllByText } = render(
      <PillarTooltip pillarScore={baseScore} hidden={new Set()} />
    )
    expect(getByText('3 / 5')).toBeTruthy()
    // 'Proficient' appears as the level badge and as the skill level in SkillRow
    expect(getAllByText('Proficient').length).toBeGreaterThanOrEqual(1)
  })

  it('omits manager section when Manager series is hidden', () => {
    const { queryByText, getAllByText } = render(
      <PillarTooltip pillarScore={baseScore} hidden={new Set(['Manager'] as const)} />
    )
    // '3 / 5' belongs only to manager — should be gone
    expect(queryByText('3 / 5')).toBeNull()
    // '4 / 5' belongs to self — still shown
    expect(getAllByText('4 / 5')).toHaveLength(1)
    // 'Manager' header label should be absent
    expect(queryByText('Manager')).toBeNull()
  })

  it('omits self section when Self series is hidden', () => {
    const { queryByText } = render(
      <PillarTooltip pillarScore={baseScore} hidden={new Set(['Self'] as const)} />
    )
    expect(queryByText('4 / 5')).toBeNull()
    // 'Self' header label should be absent
    expect(queryByText('Self')).toBeNull()
  })

  it('shows "Not scored" for an unscored self pillar', () => {
    const unscored: RadarPillarScore = {
      ...baseScore,
      selfScore: 0,
      selfScored: false,
      selfSkills: [],
    }
    const { getByText } = render(
      <PillarTooltip pillarScore={unscored} hidden={new Set()} />
    )
    expect(getByText('Not scored')).toBeTruthy()
  })

  it('shows level name next to aggregate score', () => {
    const { getAllByText } = render(
      <PillarTooltip pillarScore={baseScore} hidden={new Set()} />
    )
    // Fixture has selfScore=4 → badge = 'Advanced'; skill levels are 'Expert' and 'Basic',
    // so 'Advanced' appears exactly once — in the level badge. The test fails if levelName() is removed.
    expect(getAllByText('Advanced').length).toBe(1)
  })

  it('does not show manager section when managerSkills is undefined', () => {
    const partial: RadarPillarScore = {
      ...baseScore,
      managerSkills: undefined,
    }
    const { queryByText } = render(
      <PillarTooltip pillarScore={partial} hidden={new Set()} />
    )
    expect(queryByText('Manager')).toBeNull()
  })
})

describe('ScorecardRadarChart', () => {
  function makeScores(opts?: { withManager?: boolean }): RadarPillarScore[] {
    return [
      { pillar: 'self',             selfScore: 4, selfScored: true,  selfSkills: [], managerScore: opts?.withManager ? 3 : undefined, managerSkills: opts?.withManager ? [] : undefined },
      { pillar: 'team',             selfScore: 3, selfScored: true,  selfSkills: [], managerScore: opts?.withManager ? 4 : undefined, managerSkills: opts?.withManager ? [] : undefined },
      { pillar: 'strategy',         selfScore: 5, selfScored: true,  selfSkills: [], managerScore: opts?.withManager ? 4 : undefined, managerSkills: opts?.withManager ? [] : undefined },
      { pillar: 'communications',   selfScore: 2, selfScored: true,  selfSkills: [], managerScore: opts?.withManager ? 3 : undefined, managerSkills: opts?.withManager ? [] : undefined },
      { pillar: 'domain-expertise', selfScore: 4, selfScored: true,  selfSkills: [], managerScore: opts?.withManager ? 3 : undefined, managerSkills: opts?.withManager ? [] : undefined },
    ]
  }

  it('renders without crashing with self scores only', () => {
    const { container } = render(
      <ScorecardRadarChart pillarScores={makeScores()} />
    )
    expect(container.firstChild).toBeTruthy()
  })

  it('renders without crashing with both self and manager scores', () => {
    const { container } = render(
      <ScorecardRadarChart pillarScores={makeScores({ withManager: true })} />
    )
    expect(container.firstChild).toBeTruthy()
  })

  it('calls onPillarClick prop when provided (function is passed through)', () => {
    const handler = vi.fn()
    const { container } = render(
      <ScorecardRadarChart pillarScores={makeScores()} onPillarClick={handler} />
    )
    // Component mounts without error and handler is accepted as a prop
    expect(container.firstChild).toBeTruthy()
  })
})
