import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SkillsTable } from '../SkillsTable'
import type { SkillRow } from '../SkillsTable'

const ROWS: SkillRow[] = [
  { key: 'strategy-goal-setting', label: 'Goal Setting', pillar: 'strategy', pillarLabel: 'Strategy', level: 'Basic', score: 2, status: 'opportunity' },
  { key: 'self-resilience', label: 'Resilience', pillar: 'self', pillarLabel: 'Self', level: 'Advanced', score: 4, status: null },
  { key: 'team-coaching-mentoring', label: 'Coaching & Mentoring', pillar: 'team', pillarLabel: 'Team', level: 'Proficient', score: 3, status: 'goal' },
]

describe('SkillsTable', () => {
  it('renders all skill rows', () => {
    render(<SkillsTable rows={ROWS} />)
    expect(screen.getByText('Goal Setting')).toBeInTheDocument()
    expect(screen.getByText('Resilience')).toBeInTheDocument()
    expect(screen.getByText('Coaching & Mentoring')).toBeInTheDocument()
  })

  it('shows opportunity chip for skills with status=opportunity', () => {
    render(<SkillsTable rows={ROWS} />)
    expect(screen.getByText('💡 Opportunity')).toBeInTheDocument()
  })

  it('shows goal chip for skills with status=goal', () => {
    render(<SkillsTable rows={ROWS} />)
    expect(screen.getByText('🎯 Active goal')).toBeInTheDocument()
  })

  it('sorts by rating ascending by default (lowest first)', () => {
    render(<SkillsTable rows={ROWS} />)
    const cells = screen.getAllByRole('row').slice(1) // skip header
    expect(cells[0]).toHaveTextContent('Goal Setting') // score 2
    expect(cells[1]).toHaveTextContent('Coaching & Mentoring') // score 3
    expect(cells[2]).toHaveTextContent('Resilience') // score 4
  })

  it('sorts by skill name alphabetically when Skill button clicked', () => {
    render(<SkillsTable rows={ROWS} />)
    fireEvent.click(screen.getByRole('button', { name: /skill/i }))
    const cells = screen.getAllByRole('row').slice(1)
    expect(cells[0]).toHaveTextContent('Coaching & Mentoring')
    expect(cells[1]).toHaveTextContent('Goal Setting')
    expect(cells[2]).toHaveTextContent('Resilience')
  })
})
