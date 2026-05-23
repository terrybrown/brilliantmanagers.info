import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { SkillList } from '@/components/app/scorecard/SkillList'
import type { Skill, Level } from '@/lib/skills'

const mockTrackPillarScored = vi.hoisted(() => vi.fn())
const mockTrackRoundCompleted = vi.hoisted(() => vi.fn())
const mockTrackScorecardCompleted = vi.hoisted(() => vi.fn())
const mockSaveScore = vi.hoisted(() => vi.fn())

vi.mock('@/lib/analytics', () => ({
  trackPillarScored: mockTrackPillarScored,
  trackRoundCompleted: mockTrackRoundCompleted,
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
  mockTrackRoundCompleted.mockReset()
  mockTrackScorecardCompleted.mockReset()
  mockSaveScore.mockReset()
  ;(defaultProps.onSkillActivate as ReturnType<typeof vi.fn>).mockReset()
  ;(defaultProps.onScore as ReturnType<typeof vi.fn>).mockReset()
})

describe('SkillList analytics', () => {
  it('trackPillarScored called with pillar and level on successful save', async () => {
    mockSaveScore.mockResolvedValue({ ok: true, data: { roundCompleted: false } })

    render(<SkillList {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: /proficient/i }))

    await waitFor(() => {
      expect(mockTrackPillarScored).toHaveBeenCalledWith('self', 'Proficient')
    })
    expect(mockTrackScorecardCompleted).not.toHaveBeenCalled()
  })

  it('trackScorecardCompleted called when saveScore returns roundCompleted: true', async () => {
    mockSaveScore.mockResolvedValue({ ok: true, data: { roundCompleted: true } })

    render(<SkillList {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: /proficient/i }))

    await waitFor(() => {
      expect(mockTrackPillarScored).toHaveBeenCalledWith('self', 'Proficient')
    })
    expect(mockTrackRoundCompleted).toHaveBeenCalledWith('round-1')
    expect(mockTrackScorecardCompleted).toHaveBeenCalledTimes(1)
  })

  it('trackScorecardCompleted NOT called when saveScore returns roundCompleted: false', async () => {
    mockSaveScore.mockResolvedValue({ ok: true, data: { roundCompleted: false } })

    render(<SkillList {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: /proficient/i }))

    await waitFor(() => {
      expect(mockTrackPillarScored).toHaveBeenCalled()
    })
    expect(mockTrackRoundCompleted).not.toHaveBeenCalled()
    expect(mockTrackScorecardCompleted).not.toHaveBeenCalled()
  })

  it('trackPillarScored NOT called when saveScore throws', async () => {
    mockSaveScore.mockRejectedValue(new Error('Server error'))
    const mockOnScore = vi.fn()
    render(<SkillList {...defaultProps} onScore={mockOnScore} />)
    fireEvent.click(screen.getByRole('button', { name: /proficient/i }))
    await waitFor(() => {
      // The catch block calls onScore to revert the optimistic update
      expect(mockOnScore).toHaveBeenCalled()
    })
    expect(mockTrackPillarScored).not.toHaveBeenCalled()
    expect(mockTrackRoundCompleted).not.toHaveBeenCalled()
  })
})
