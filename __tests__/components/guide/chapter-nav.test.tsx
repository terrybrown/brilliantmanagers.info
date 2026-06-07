import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ChapterNav } from '@/components/guide/chapter-nav'

vi.mock('@/components/guide/guide-data-context', () => ({
  useGuideData: vi.fn(() => null),
}))

vi.mock('@/config/scoring', () => ({
  SCORING_LEVEL_COLORS: {
    Developing: { color: '#C0552F', bg: 'rgba(192,85,47,0.12)', border: 'rgba(192,85,47,0.30)' },
    Basic: { color: '#CC8A1A', bg: 'rgba(204,138,26,0.12)', border: 'rgba(204,138,26,0.30)' },
    Proficient: { color: '#7A9A3C', bg: 'rgba(122,154,60,0.12)', border: 'rgba(122,154,60,0.30)' },
    Advanced: { color: '#0E7C6B', bg: 'rgba(14,124,107,0.12)', border: 'rgba(14,124,107,0.30)' },
    Expert: { color: '#0B5448', bg: 'rgba(11,84,72,0.12)', border: 'rgba(11,84,72,0.30)' },
  },
}))

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

describe('ChapterNav', () => {
  it('renders all 5 pillar labels', () => {
    render(<ChapterNav activeSlug="self" skills={[]} />)
    expect(screen.getByText('Self')).toBeInTheDocument()
    expect(screen.getByText('Team')).toBeInTheDocument()
    expect(screen.getByText('Strategy')).toBeInTheDocument()
    expect(screen.getByText('Communications')).toBeInTheDocument()
    expect(screen.getByText('Domain Expertise')).toBeInTheDocument()
  })

  it('renders two-digit ordinal numbers for pillars', () => {
    render(<ChapterNav activeSlug="self" skills={[]} />)
    expect(screen.getByText('01')).toBeInTheDocument()
    expect(screen.getByText('05')).toBeInTheDocument()
  })

  it('renders skill sub-items under the active pillar', () => {
    const skills = [
      { id: 'time-and-task-management', text: 'Time and Task Management' },
      { id: 'empathy-and-compassion', text: 'Empathy and Compassion' },
    ]
    render(<ChapterNav activeSlug="self" skills={skills} />)
    expect(screen.getByText('Time and Task Management')).toBeInTheDocument()
    expect(screen.getByText('Empathy and Compassion')).toBeInTheDocument()
  })

  it('does not render skill buttons when skills array is empty', () => {
    render(<ChapterNav activeSlug="self" skills={[]} />)
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('links each pillar to its guide page', () => {
    render(<ChapterNav activeSlug="self" skills={[]} />)
    const teamLink = screen.getByRole('link', { name: /Team/i })
    expect(teamLink).toHaveAttribute('href', '/the-guide/team')
  })
})
