import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { JoinNowForm } from '@/app/the-tool/JoinNowForm'

const mockSignInWithOtp = vi.fn()

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: { signInWithOtp: mockSignInWithOtp },
  }),
}))

beforeEach(() => {
  mockSignInWithOtp.mockReset()
})

describe('JoinNowForm', () => {
  it('renders email input, join now button, and sign in link', () => {
    render(<JoinNowForm />)
    expect(screen.getByPlaceholderText('your@email.com')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /join now/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /sign in/i })).toHaveAttribute('href', '/login')
  })

  it('calls signInWithOtp with the entered email on submit', async () => {
    mockSignInWithOtp.mockResolvedValue({ error: null })
    render(<JoinNowForm />)

    fireEvent.change(screen.getByPlaceholderText('your@email.com'), {
      target: { value: 'test@example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: /join now/i }))

    await waitFor(() => {
      expect(mockSignInWithOtp).toHaveBeenCalledWith({
        email: 'test@example.com',
        options: expect.objectContaining({ emailRedirectTo: expect.stringContaining('/auth/callback') }),
      })
    })
  })

  it('shows success state after OTP is sent', async () => {
    mockSignInWithOtp.mockResolvedValue({ error: null })
    render(<JoinNowForm />)

    fireEvent.change(screen.getByPlaceholderText('your@email.com'), {
      target: { value: 'test@example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: /join now/i }))

    await waitFor(() => {
      expect(screen.getByText(/check your email/i)).toBeInTheDocument()
      expect(screen.getByText(/test@example\.com/)).toBeInTheDocument()
    })
  })

  it('shows error message when OTP call fails', async () => {
    mockSignInWithOtp.mockResolvedValue({ error: { message: 'Rate limit exceeded' } })
    render(<JoinNowForm />)

    fireEvent.change(screen.getByPlaceholderText('your@email.com'), {
      target: { value: 'test@example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: /join now/i }))

    await waitFor(() => {
      expect(screen.getByText('Rate limit exceeded')).toBeInTheDocument()
    })
  })
})
