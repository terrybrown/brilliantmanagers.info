import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/app/(app)/manager/[userId]/actions', () => ({
  saveManagerScore: vi.fn().mockResolvedValue(undefined),
}))

import { ManagerScoringView } from '@/components/app/ManagerScoringView'

// Minimal stub data
const SKILLS = [
  { key: 'sk1', label: 'Skill One', description: 'desc', pillar: 'self' as const },
]

const BASE_PROPS = {
  roundId: 'r1',
  pillar: 'self',
  pillarLabel: 'Self',
  skills: SKILLS,
  initialScores: {},
  directReportName: 'Alice',
  userId: 'u1',
  directReportScores: null,
  isBlindMode: false,
}

describe('ManagerScoringView', () => {
  it('shows informed mode note when not blind and scores provided', () => {
    render(<ManagerScoringView {...BASE_PROPS} directReportScores={{ sk1: 'Developing' }} />)
    expect(screen.getByText(/informed mode/i)).toBeInTheDocument()
  })

  it('hides informed mode note when isBlindMode is true', () => {
    render(<ManagerScoringView {...BASE_PROPS} directReportScores={{ sk1: 'Developing' }} isBlindMode />)
    expect(screen.queryByText(/informed mode/i)).toBeNull()
  })

  it('hides informed mode note when directReportScores is null', () => {
    render(<ManagerScoringView {...BASE_PROPS} directReportScores={null} />)
    expect(screen.queryByText(/informed mode/i)).toBeNull()
  })
})
