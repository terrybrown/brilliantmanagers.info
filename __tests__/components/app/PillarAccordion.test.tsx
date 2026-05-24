import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { PillarAccordion } from '@/components/app/PillarAccordion'
import type { PillarData } from '@/components/app/PillarAccordion'

const BASE_SKILL = {
  key: 'self-resilience',
  name: 'Resilience',
  description: 'How you handle pressure.',
  level: 'Proficient' as const,
  score: 3,
  chipType: null as null,
}

const BASE_PILLAR: PillarData = {
  pillar: 'self',
  label: 'Self',
  score: 3.2,
  isLowest: false,
  skills: [BASE_SKILL],
}

describe('PillarAccordion — collapsed header', () => {
  it('renders pillar name and score', () => {
    render(<PillarAccordion pillars={[BASE_PILLAR]} openPillar={null} onOpenChange={() => {}} />)
    expect(screen.getByText('Self')).toBeInTheDocument()
    expect(screen.getByText('3.2')).toBeInTheDocument()
  })

  it('shows "Mgr X.X" pill when managerScore is provided', () => {
    const pillar = { ...BASE_PILLAR, managerScore: 2.8 }
    render(<PillarAccordion pillars={[pillar]} openPillar={null} onOpenChange={() => {}} />)
    expect(screen.getByText('Mgr 2.8')).toBeInTheDocument()
  })

  it('does not show Mgr pill when managerScore is undefined', () => {
    render(<PillarAccordion pillars={[BASE_PILLAR]} openPillar={null} onOpenChange={() => {}} />)
    expect(screen.queryByText(/^Mgr \d/)).toBeNull()
  })
})

describe('PillarAccordion — expanded detail', () => {
  it('shows "All skills" section heading for chipType null skills', () => {
    render(
      <PillarAccordion pillars={[BASE_PILLAR]} openPillar="self" onOpenChange={() => {}} />
    )
    expect(screen.getByText('All skills')).toBeInTheDocument()
    expect(screen.getByText('Resilience')).toBeInTheDocument()
    expect(screen.getByText('How you handle pressure.')).toBeInTheDocument()
  })

  it('shows You score badge for every skill in the all-skills section', () => {
    render(
      <PillarAccordion pillars={[BASE_PILLAR]} openPillar="self" onOpenChange={() => {}} />
    )
    expect(screen.getAllByText('You').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Proficient')).toBeInTheDocument()
  })

  it('shows Mgr score badge when managerLevel is provided', () => {
    const skill = { ...BASE_SKILL, managerLevel: 'Advanced' as const }
    const pillar = { ...BASE_PILLAR, skills: [skill] }
    render(
      <PillarAccordion pillars={[pillar]} openPillar="self" onOpenChange={() => {}} />
    )
    expect(screen.getByText('Mgr')).toBeInTheDocument()
    expect(screen.getByText('Advanced')).toBeInTheDocument()
  })

  it('omits Mgr badge when managerLevel is undefined', () => {
    render(
      <PillarAccordion pillars={[BASE_PILLAR]} openPillar="self" onOpenChange={() => {}} />
    )
    // "Mgr" as exact text only appears in skill rows; pillar header pill says "Mgr X.X"
    expect(screen.queryByText('Mgr')).toBeNull()
  })

  it('does not show action links for chipType null skills', () => {
    render(
      <PillarAccordion pillars={[BASE_PILLAR]} openPillar="self" onOpenChange={() => {}} />
    )
    expect(screen.queryByRole('link', { name: /make goal/i })).toBeNull()
    expect(screen.queryByRole('link', { name: /in growth/i })).toBeNull()
  })

  it('shows Active Goals section for goal-type skills with action link', () => {
    const goalSkill = { ...BASE_SKILL, key: 'self-resilience-goal', chipType: 'goal' as const, goalText: 'Daily reflection' }
    const pillar = { ...BASE_PILLAR, skills: [goalSkill] }
    render(
      <PillarAccordion pillars={[pillar]} openPillar="self" onOpenChange={() => {}} />
    )
    expect(screen.getByText('Active Goals')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /in growth/i })).toBeInTheDocument()
  })
})
