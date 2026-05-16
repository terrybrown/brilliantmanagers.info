import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SkillCard } from '@/components/app/SkillCard'

const skill = {
  key: 'self-resilience',
  pillar: 'self' as const,
  label: 'Resilience',
  description: 'How consistently you maintain your effectiveness under pressure.',
}

describe('SkillCard', () => {
  it('renders expanded with label, description and level buttons when no level selected', () => {
    render(<SkillCard skill={skill} currentLevel={null} onSelect={vi.fn()} />)
    expect(screen.getByText('Resilience')).toBeTruthy()
    expect(screen.getByText(/maintain your effectiveness/)).toBeTruthy()
    expect(screen.getByText('Proficient')).toBeTruthy()
  })

  it('calls onSelect with the chosen level', () => {
    const onSelect = vi.fn()
    render(<SkillCard skill={skill} currentLevel={null} onSelect={onSelect} />)
    fireEvent.click(screen.getByText('Advanced'))
    expect(onSelect).toHaveBeenCalledWith('self-resilience', 'Advanced')
  })

  it('renders collapsed when a level is already selected', () => {
    render(<SkillCard skill={skill} currentLevel="Advanced" onSelect={vi.fn()} />)
    expect(screen.getByText('Resilience')).toBeTruthy()
    expect(screen.getByText('Advanced')).toBeTruthy()
    expect(screen.queryByText(/maintain your effectiveness/)).toBeNull()
  })

  it('expands again when collapsed card is clicked', () => {
    render(<SkillCard skill={skill} currentLevel="Advanced" onSelect={vi.fn()} />)
    fireEvent.click(screen.getByText('Resilience'))
    expect(screen.getByText(/maintain your effectiveness/)).toBeTruthy()
  })
})
