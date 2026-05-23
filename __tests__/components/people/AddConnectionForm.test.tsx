import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AddConnectionForm } from '@/components/people/AddConnectionForm'

const mockTrackManagerInvited = vi.hoisted(() => vi.fn())
const mockInviteConnection = vi.hoisted(() => vi.fn())

vi.mock('@/lib/analytics', () => ({
  trackManagerInvited: mockTrackManagerInvited,
}))

vi.mock('@/app/(app)/connections/actions', () => ({
  inviteConnection: mockInviteConnection,
}))

beforeEach(() => {
  mockTrackManagerInvited.mockReset()
  mockInviteConnection.mockReset()
})

describe('AddConnectionForm analytics', () => {
  it('calls trackManagerInvited when inviteConnection returns ok: true', async () => {
    mockInviteConnection.mockResolvedValue({ ok: true })
    render(<AddConnectionForm />)

    // Open the form
    fireEvent.click(screen.getByText('+ Add connection'))

    // Submit the form
    const emailInput = screen.getByPlaceholderText('colleague@company.com')
    fireEvent.change(emailInput, { target: { value: 'boss@example.com' } })
    fireEvent.submit(emailInput.closest('form')!)

    await waitFor(() => {
      expect(mockTrackManagerInvited).toHaveBeenCalledTimes(1)
    })
  })

  it('does not call trackManagerInvited when inviteConnection returns ok: false', async () => {
    mockInviteConnection.mockResolvedValue({ ok: false, error: 'Some error' })
    render(<AddConnectionForm />)

    fireEvent.click(screen.getByText('+ Add connection'))

    const emailInput = screen.getByPlaceholderText('colleague@company.com')
    fireEvent.change(emailInput, { target: { value: 'boss@example.com' } })
    fireEvent.submit(emailInput.closest('form')!)

    await waitFor(() => {
      expect(screen.getByText('Some error')).toBeInTheDocument()
    })
    expect(mockTrackManagerInvited).not.toHaveBeenCalled()
  })
})
