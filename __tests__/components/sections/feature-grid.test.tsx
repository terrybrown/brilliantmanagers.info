import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FeatureGrid } from '@/components/sections/feature-grid'

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
    const { container } = render(<FeatureGrid cards={[baseCard]} />)
    const card = container.querySelector('.rounded-xl')
    expect(card).toHaveStyle({ background: 'rgba(254,252,247,0.05)' })
  })

  it('applies amber background and border to a primary card', () => {
    const { container } = render(
      <FeatureGrid cards={[{ ...baseCard, primary: true }]} />
    )
    const card = container.querySelector('.rounded-xl')
    expect(card).toHaveStyle({ background: 'rgba(245,158,11,0.07)' })
    expect(card).toHaveStyle({ border: '1px solid rgba(245,158,11,0.30)' })
  })
})
