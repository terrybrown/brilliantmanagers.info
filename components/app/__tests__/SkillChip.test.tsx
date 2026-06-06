import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SkillChip } from '../SkillChip'

describe('SkillChip', () => {
  it('renders the label for an opportunity chip', () => {
    render(<SkillChip type="opportunity" label="Resilience" />)
    expect(screen.getByText('Resilience')).toBeInTheDocument()
  })

  it('renders the label for a goal chip', () => {
    render(<SkillChip type="goal" label="Emotional Intelligence" />)
    expect(screen.getByText('Emotional Intelligence')).toBeInTheDocument()
  })

  it('applies muted colour for opportunity', () => {
    const { container } = render(<SkillChip type="opportunity" label="Test" />)
    const chip = container.firstChild as HTMLElement
    expect(chip.style.color).toBe('rgb(86, 97, 89)')
  })

  it('applies teal colour for goal', () => {
    const { container } = render(<SkillChip type="goal" label="Test" />)
    const chip = container.firstChild as HTMLElement
    expect(chip.style.color).toBe('rgb(14, 124, 107)')
  })
})
