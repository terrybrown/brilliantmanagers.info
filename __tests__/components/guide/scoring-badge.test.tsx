import { render, screen } from '@testing-library/react'
import { ScoringBadge } from '@/components/guide/scoring-badge'

describe('ScoringBadge', () => {
  it('renders the level name', () => {
    render(<ScoringBadge level="Proficient" />)
    expect(screen.getByText('Proficient')).toBeInTheDocument()
  })

  it('renders Developing level without crashing', () => {
    render(<ScoringBadge level="Developing" />)
    expect(screen.getByText('Developing')).toBeInTheDocument()
  })

  it('renders all five levels without crashing', () => {
    const levels = ['Developing', 'Basic', 'Proficient', 'Advanced', 'Expert'] as const
    levels.forEach((level) => {
      const { unmount } = render(<ScoringBadge level={level} />)
      expect(screen.getByText(level)).toBeInTheDocument()
      unmount()
    })
  })
})
