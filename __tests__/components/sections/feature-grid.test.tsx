import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FeatureGrid, CARD_STYLE_DEFAULT, CARD_STYLE_PRIMARY } from '@/components/sections/feature-grid'

const baseCard = {
  icon: null,
  title: 'The Tool',
  body: 'Know where you are.',
  href: '/the-tool',
  linkLabel: 'Open the scorecard',
}

describe('FeatureGrid', () => {
  it('renders card title, body, and link', () => {
    render(<FeatureGrid cards={[baseCard]} />)
    expect(screen.getByText('The Tool')).toBeInTheDocument()
    expect(screen.getByText('Know where you are.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /open the scorecard/i })).toHaveAttribute('href', '/the-tool')
  })

  it('applies default (non-primary) background to a standard card', () => {
    render(<FeatureGrid cards={[baseCard]} />)
    const card = screen.getByTestId('feature-card-/the-tool')
    expect(card).toHaveStyle(CARD_STYLE_DEFAULT)
    expect(card).not.toHaveStyle({ border: CARD_STYLE_PRIMARY.border })
  })

  it('applies amber background and border to a primary card', () => {
    render(<FeatureGrid cards={[{ ...baseCard, primary: true }]} />)
    const card = screen.getByTestId('feature-card-/the-tool')
    expect(card).toHaveStyle(CARD_STYLE_PRIMARY)
  })

  it('applies primary styling to only the primary card when multiple cards are rendered', () => {
    const primaryCard = { ...baseCard, primary: true }
    const secondCard = {
      icon: null,
      title: 'The Guide',
      body: 'Five pillars.',
      href: '/the-guide',
      linkLabel: 'Start reading',
    }
    render(<FeatureGrid cards={[primaryCard, secondCard]} />)

    const toolCard = screen.getByTestId('feature-card-/the-tool')
    const guideCard = screen.getByTestId('feature-card-/the-guide')

    expect(toolCard).toHaveStyle(CARD_STYLE_PRIMARY)
    expect(guideCard).toHaveStyle(CARD_STYLE_DEFAULT)
    expect(guideCard).not.toHaveStyle({ border: CARD_STYLE_PRIMARY.border })
  })
})
