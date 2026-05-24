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
