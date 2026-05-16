import { render, screen } from '@testing-library/react'
import { ScoringBadge } from '@/components/guide/scoring-badge'

describe('ScoringBadge', () => {
  it('renders the level name', () => {
    render(<ScoringBadge level="Proficient" />)
    expect(screen.getByText('Proficient')).toBeInTheDocument()
  })

  it('renders Needs Improvement level without crashing', () => {
    render(<ScoringBadge level="Needs Improvement" />)
    expect(screen.getByText('Needs Improvement')).toBeInTheDocument()
  })

  it('renders all five levels without crashing', () => {
    const levels = ['Needs Improvement', 'Basic', 'Proficient', 'Advanced', 'Expert'] as const
    levels.forEach((level) => {
      const { unmount } = render(<ScoringBadge level={level} />)
      expect(screen.getByText(level)).toBeInTheDocument()
      unmount()
    })
  })
})
