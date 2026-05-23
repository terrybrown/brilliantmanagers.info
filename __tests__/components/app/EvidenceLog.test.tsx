import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { EvidenceLog } from '@/components/app/EvidenceLog'

const mockTrackGoalCheckin = vi.hoisted(() => vi.fn())
const mockAddEvidenceAction = vi.hoisted(() => vi.fn())

vi.mock('@/lib/analytics', () => ({
  trackGoalCheckin: mockTrackGoalCheckin,
}))

vi.mock('@/app/(app)/growth/actions', () => ({
  addEvidenceAction: mockAddEvidenceAction,
}))

beforeEach(() => {
  mockTrackGoalCheckin.mockReset()
  mockAddEvidenceAction.mockReset()
  mockAddEvidenceAction.mockResolvedValue({ ok: true })
})

describe('EvidenceLog', () => {
  it('calls trackGoalCheckin after addEvidenceAction resolves', async () => {
    render(<EvidenceLog planId="plan-1" entries={[]} />)

    fireEvent.click(screen.getByRole('button', { name: /\+ add evidence/i }))

    fireEvent.change(screen.getByLabelText(/what did you do/i), { target: { value: 'Did something' } })
    fireEvent.change(screen.getByLabelText(/what was the impact/i), { target: { value: 'Positive impact' } })

    const form = screen.getByRole('button', { name: /^save$/i }).closest('form')!
    fireEvent.submit(form)

    await waitFor(() => {
      expect(mockAddEvidenceAction).toHaveBeenCalledTimes(1)
      expect(mockTrackGoalCheckin).toHaveBeenCalledTimes(1)
    })
  })

  it('does not call trackGoalCheckin when addEvidenceAction throws', async () => {
    mockAddEvidenceAction.mockRejectedValue(new Error('server error'))

    render(<EvidenceLog planId="plan-1" entries={[]} />)

    fireEvent.click(screen.getByRole('button', { name: /\+ add evidence/i }))

    fireEvent.change(screen.getByLabelText(/what did you do/i), { target: { value: 'Did something' } })
    fireEvent.change(screen.getByLabelText(/what was the impact/i), { target: { value: 'Positive impact' } })

    const form = screen.getByRole('button', { name: /^save$/i }).closest('form')!
    fireEvent.submit(form)

    await waitFor(() => {
      expect(mockAddEvidenceAction).toHaveBeenCalledTimes(1)
    })
    expect(mockTrackGoalCheckin).not.toHaveBeenCalled()
  })
})
