import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { JoinNowForm } from '@/app/the-tool/JoinNowForm'

const { mockSignInWithOtp } = vi.hoisted(() => ({
  mockSignInWithOtp: vi.fn(),
}))

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
        options: { emailRedirectTo: 'http://localhost/auth/callback' },
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

  it('hides the join now button and shows loading dots while submitting', async () => {
    let resolve: (value: { error: null }) => void
    mockSignInWithOtp.mockReturnValue(new Promise(r => { resolve = r }))
    render(<JoinNowForm />)

    fireEvent.change(screen.getByPlaceholderText('your@email.com'), {
      target: { value: 'test@example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: /join now/i }))

    // Button should be gone, dots should be present
    expect(screen.queryByRole('button', { name: /join now/i })).not.toBeInTheDocument()
    expect(screen.getByLabelText('Sending…')).toBeInTheDocument()

    // Resolve the promise to clean up
    resolve!({ error: null })
    await waitFor(() => expect(screen.getByText(/check your email/i)).toBeInTheDocument())
  })
})
