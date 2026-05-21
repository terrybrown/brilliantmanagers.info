import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { GoalForm } from '@/components/app/GoalForm'

const mockTrackGoalCreated = vi.hoisted(() => vi.fn())
const mockSaveGoalAction = vi.hoisted(() => vi.fn())

vi.mock('@/lib/analytics', () => ({
  trackGoalCreated: mockTrackGoalCreated,
}))

vi.mock('@/app/(app)/growth/actions', () => ({
  saveGoalAction: mockSaveGoalAction,
}))

beforeEach(() => {
  mockTrackGoalCreated.mockReset()
  mockSaveGoalAction.mockReset()
  mockSaveGoalAction.mockResolvedValue(undefined)
})

describe('GoalForm', () => {
  it('calls trackGoalCreated on form submit', async () => {
    render(<GoalForm initialSkillKey="self-awareness" resources={[]} allSkillsForSelector={[]} />)

    const form = screen.getByRole('button', { name: /save goal/i }).closest('form')!
    fireEvent.submit(form)

    await waitFor(() => {
      expect(mockTrackGoalCreated).toHaveBeenCalledTimes(1)
    })
  })

  it('calls saveGoalAction on form submit', async () => {
    render(<GoalForm initialSkillKey="self-awareness" resources={[]} allSkillsForSelector={[]} />)

    const form = screen.getByRole('button', { name: /save goal/i }).closest('form')!
    fireEvent.submit(form)

    await waitFor(() => {
      expect(mockSaveGoalAction).toHaveBeenCalledTimes(1)
    })
  })
})
