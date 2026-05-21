import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { SkillList } from '@/components/app/scorecard/SkillList'
import type { Skill, Level } from '@/lib/skills'

const mockTrackPillarScored = vi.hoisted(() => vi.fn())
const mockTrackScorecardCompleted = vi.hoisted(() => vi.fn())
const mockSaveScore = vi.hoisted(() => vi.fn())

vi.mock('@/lib/analytics', () => ({
  trackPillarScored: mockTrackPillarScored,
  trackScorecardCompleted: mockTrackScorecardCompleted,
}))

vi.mock('@/app/(app)/scorecard/actions', () => ({
  saveScore: mockSaveScore,
}))

const mockSkill: Skill = {
  key: 'self-awareness',
  label: 'Self-Awareness',
  pillar: 'self',
  description: 'Understanding yourself',
}

const defaultProps = {
  skills: [mockSkill],
  scores: {} as Record<string, Level>,
  roundId: 'round-1',
  activeSkillKey: null,
  onSkillActivate: vi.fn(),
  onScore: vi.fn(),
}

beforeEach(() => {
  mockTrackPillarScored.mockReset()
  mockTrackScorecardCompleted.mockReset()
  mockSaveScore.mockReset()
})

describe('SkillList analytics', () => {
  it('trackPillarScored called with pillar and level on successful save', async () => {
    mockSaveScore.mockResolvedValue({ roundCompleted: false })

    render(<SkillList {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: /proficient/i }))

    await waitFor(() => {
      expect(mockTrackPillarScored).toHaveBeenCalledWith('self', 'Proficient')
    })
    expect(mockTrackScorecardCompleted).not.toHaveBeenCalled()
  })

  it('trackScorecardCompleted called when saveScore returns roundCompleted: true', async () => {
    mockSaveScore.mockResolvedValue({ roundCompleted: true })

    render(<SkillList {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: /proficient/i }))

    await waitFor(() => {
      expect(mockTrackPillarScored).toHaveBeenCalledWith('self', 'Proficient')
    })
    expect(mockTrackScorecardCompleted).toHaveBeenCalledTimes(1)
  })

  it('trackScorecardCompleted NOT called when saveScore returns roundCompleted: false', async () => {
    mockSaveScore.mockResolvedValue({ roundCompleted: false })

    render(<SkillList {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: /proficient/i }))

    await waitFor(() => {
      expect(mockTrackPillarScored).toHaveBeenCalled()
    })
    expect(mockTrackScorecardCompleted).not.toHaveBeenCalled()
  })

  it('trackPillarScored NOT called when saveScore throws', async () => {
    mockSaveScore.mockRejectedValue(new Error('Server error'))

    render(<SkillList {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: /proficient/i }))

    // Wait for the async transition to settle by checking the revert callback
    await waitFor(() => {
      expect(mockSaveScore).toHaveBeenCalled()
    })
    // Give the catch block time to execute
    await new Promise(r => setTimeout(r, 50))
    expect(mockTrackPillarScored).not.toHaveBeenCalled()
  })
})
