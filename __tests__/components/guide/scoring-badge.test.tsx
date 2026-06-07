import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ScoringBadge } from '@/components/guide/scoring-badge'

describe('ScoringBadge', () => {
  it('renders just the level name by default (you=false)', () => {
    render(<ScoringBadge level="Proficient" />)
    expect(screen.getByText('Proficient')).toBeInTheDocument()
  })

  it('renders "You · {level}" when you prop is true', () => {
    render(<ScoringBadge level="Advanced" you />)
    expect(screen.getByText('You · Advanced')).toBeInTheDocument()
  })

  it('renders all five levels without crashing', () => {
    const levels = ['Developing', 'Basic', 'Proficient', 'Advanced', 'Expert'] as const
    for (const level of levels) {
      const { unmount } = render(<ScoringBadge level={level} />)
      expect(screen.getByText(level)).toBeInTheDocument()
      unmount()
    }
  })

  it('renders a coloured dot span inside the badge', () => {
    const { container } = render(<ScoringBadge level="Advanced" />)
    const dot = container.querySelector('span > span')
    expect(dot).not.toBeNull()
  })
})
