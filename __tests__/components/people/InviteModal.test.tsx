import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { InviteModal } from '@/components/people/InviteModal'

vi.mock('@/app/(app)/connections/actions', () => ({
  inviteConnection: vi.fn().mockResolvedValue({ ok: true }),
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

describe('InviteModal', () => {
  it('renders trigger button', () => {
    render(<InviteModal />)
    expect(screen.getByRole('button', { name: /invite/i })).toBeTruthy()
  })

  it('opens modal on trigger click', () => {
    render(<InviteModal />)
    fireEvent.click(screen.getByRole('button', { name: /invite/i }))
    expect(screen.getByRole('heading', { name: /invite someone/i })).toBeTruthy()
  })

  it('shows email input, role options, and optional message field', () => {
    render(<InviteModal />)
    fireEvent.click(screen.getByRole('button', { name: /invite/i }))
    expect(screen.getByPlaceholderText(/email/i)).toBeTruthy()
    expect(screen.getByLabelText(/direct report/i)).toBeTruthy()
    expect(screen.getByLabelText(/manager/i)).toBeTruthy()
    expect(screen.getByPlaceholderText(/personal note/i)).toBeTruthy()
  })

  it('closes on backdrop click', () => {
    render(<InviteModal />)
    fireEvent.click(screen.getByRole('button', { name: /invite/i }))
    const backdrop = screen.getByTestId('modal-backdrop')
    fireEvent.click(backdrop)
    expect(screen.queryByRole('heading', { name: /invite someone/i })).toBeNull()
  })
})
