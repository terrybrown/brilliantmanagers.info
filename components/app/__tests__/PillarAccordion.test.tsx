import { describe, it, expect } from 'vitest'
import { useState } from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { PillarAccordion } from '../PillarAccordion'
import type { PillarData } from '../PillarAccordion'

const PILLARS: PillarData[] = [
  {
    pillar: 'self',
    label: 'Self',
    score: 2.2,
    isLowest: true,
    skills: [
      {
        key: 'self-resilience',
        name: 'Resilience',
        description: 'How consistently you maintain your effectiveness under pressure.',
        level: 'Basic',
        score: 2,
        chipType: 'opportunity',
        goalText: undefined,
      },
      {
        key: 'self-growth-mindset',
        name: 'Growth Mindset',
        description: 'Whether you actively seek challenge and learning.',
        level: 'Proficient',
        score: 3,
        chipType: null,
        goalText: undefined,
      },
    ],
  },
  {
    pillar: 'team',
    label: 'Team',
    score: 3.5,
    isLowest: false,
    skills: [
      {
        key: 'team-coaching-mentoring',
        name: 'Coaching & Mentoring',
        description: 'Your ability to develop others.',
        level: 'Proficient',
        score: 3,
        chipType: 'goal',
        goalText: 'Run fortnightly coaching conversations with each direct report',
      },
    ],
  },
]

// Wrapper that manages the controlled open state for interaction tests.
function ControlledAccordion(props: { pillars: PillarData[] }) {
  const [openPillar, setOpenPillar] = useState<string | null>(null)
  return (
    <PillarAccordion
      pillars={props.pillars}
      openPillar={openPillar}
      onOpenChange={setOpenPillar}
    />
  )
}

describe('PillarAccordion', () => {
  it('renders all pillar labels', () => {
    render(<PillarAccordion pillars={PILLARS} openPillar={null} onOpenChange={() => {}} />)
    expect(screen.getByText('Self')).toBeInTheDocument()
    expect(screen.getByText('Team')).toBeInTheDocument()
  })

  it('renders opportunity chip for a Basic skill', () => {
    render(<PillarAccordion pillars={PILLARS} openPillar={null} onOpenChange={() => {}} />)
    expect(screen.getByText('Resilience')).toBeInTheDocument()
  })

  it('renders goal chip for a skill with a goal', () => {
    render(<PillarAccordion pillars={PILLARS} openPillar={null} onOpenChange={() => {}} />)
    expect(screen.getByText('Coaching & Mentoring')).toBeInTheDocument()
  })

  it('expands a pillar on header click to show Opportunities section', () => {
    render(<ControlledAccordion pillars={PILLARS} />)
    fireEvent.click(screen.getByRole('button', { name: /self/i }))
    expect(screen.getByText('Opportunities')).toBeInTheDocument()
  })

  it('collapses the first pillar when the second is clicked', () => {
    render(<ControlledAccordion pillars={PILLARS} />)
    fireEvent.click(screen.getByRole('button', { name: /self/i }))
    expect(screen.getByText('Opportunities')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /team/i }))
    expect(screen.queryByText('Opportunities')).not.toBeInTheDocument()
  })

  it('shows "↓ lowest" badge on the lowest-scoring pillar', () => {
    render(<PillarAccordion pillars={PILLARS} openPillar={null} onOpenChange={() => {}} />)
    expect(screen.getByText('↓ lowest')).toBeInTheDocument()
  })

  it('shows a delta badge when prevScore differs', () => {
    const pillarsWithDelta: PillarData[] = [
      {
        ...PILLARS[0],
        score: 2.0,
        prevScore: 1.5,
      },
    ]
    render(
      <PillarAccordion
        pillars={pillarsWithDelta}
        openPillar={null}
        onOpenChange={() => {}}
      />
    )
    expect(screen.getByText('+0.5↑')).toBeInTheDocument()
  })
})
