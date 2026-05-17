import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BetaSignupForm } from '@/components/tool/BetaSignupForm'

const mockSignInWithOtp = vi.fn()

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: { signInWithOtp: mockSignInWithOtp },
  }),
}))

beforeEach(() => {
  mockSignInWithOtp.mockReset()
})

describe('BetaSignupForm', () => {
  it('renders email input and submit button', () => {
    render(<BetaSignupForm />)
    expect(screen.getByPlaceholderText('your@email.com')).toBeTruthy()
    expect(screen.getByRole('button', { name: /get early access/i })).toBeTruthy()
  })

  it('calls signInWithOtp with the entered email on submit', async () => {
    mockSignInWithOtp.mockResolvedValue({ error: null })
    render(<BetaSignupForm />)
    fireEvent.change(screen.getByPlaceholderText('your@email.com'), {
      target: { value: 'test@example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: /get early access/i }))
    await waitFor(() => {
      expect(mockSignInWithOtp).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'test@example.com' })
      )
    })
  })

  it('shows success state after successful submission', async () => {
    mockSignInWithOtp.mockResolvedValue({ error: null })
    render(<BetaSignupForm />)
    fireEvent.change(screen.getByPlaceholderText('your@email.com'), {
      target: { value: 'test@example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: /get early access/i }))
    await waitFor(() => {
      expect(screen.getByText(/check your email/i)).toBeTruthy()
      expect(screen.getByText('test@example.com')).toBeTruthy()
    })
  })

  it('hides the form after successful submission', async () => {
    mockSignInWithOtp.mockResolvedValue({ error: null })
    render(<BetaSignupForm />)
    fireEvent.change(screen.getByPlaceholderText('your@email.com'), {
      target: { value: 'test@example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: /get early access/i }))
    await waitFor(() => {
      expect(screen.queryByPlaceholderText('your@email.com')).toBeNull()
    })
  })

  it('shows error message on failure', async () => {
    mockSignInWithOtp.mockResolvedValue({ error: { message: 'Rate limit exceeded' } })
    render(<BetaSignupForm />)
    fireEvent.change(screen.getByPlaceholderText('your@email.com'), {
      target: { value: 'test@example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: /get early access/i }))
    await waitFor(() => {
      expect(screen.getByText('Rate limit exceeded')).toBeTruthy()
    })
  })

  it('keeps the form visible after an error', async () => {
    mockSignInWithOtp.mockResolvedValue({ error: { message: 'Rate limit exceeded' } })
    render(<BetaSignupForm />)
    fireEvent.change(screen.getByPlaceholderText('your@email.com'), {
      target: { value: 'test@example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: /get early access/i }))
    await waitFor(() => {
      expect(screen.getByPlaceholderText('your@email.com')).toBeTruthy()
    })
  })
})
