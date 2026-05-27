import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

// Mock Turnstile — renders a button that fires onSuccess when clicked
vi.mock('@marsidev/react-turnstile', () => ({
  Turnstile: ({ onSuccess }: { onSuccess: (token: string) => void }) => (
    <button type="button" data-testid="turnstile-mock" onClick={() => onSuccess('test-captcha-token')}>
      verify
    </button>
  ),
}))

// Mock Supabase client — module-level createClient in JoinNowForm
const mockSignInWithOtp = vi.hoisted(() => vi.fn())
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: { signInWithOtp: mockSignInWithOtp },
  }),
}))

// Mock next/link (not needed for logic, but avoids router errors in jsdom)
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

import { JoinNowForm } from '@/app/the-tool/JoinNowForm'

describe('JoinNowForm', () => {
  beforeEach(() => {
    mockSignInWithOtp.mockReset()
  })

  it('disables the submit button before Turnstile fires', () => {
    render(<JoinNowForm />)
    expect(screen.getByRole('button', { name: /join now/i })).toBeDisabled()
  })

  it('enables the submit button after Turnstile fires onSuccess', () => {
    render(<JoinNowForm />)
    fireEvent.click(screen.getByTestId('turnstile-mock'))
    expect(screen.getByRole('button', { name: /join now/i })).not.toBeDisabled()
  })

  it('calls signInWithOtp with email and captchaToken on submit', async () => {
    mockSignInWithOtp.mockResolvedValue({ error: null })
    render(<JoinNowForm />)

    fireEvent.click(screen.getByTestId('turnstile-mock'))
    fireEvent.change(screen.getByPlaceholderText('your@email.com'), {
      target: { value: 'user@example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: /join now/i }))

    await waitFor(() => {
      expect(mockSignInWithOtp).toHaveBeenCalledWith({
        email: 'user@example.com',
        options: expect.objectContaining({ captchaToken: 'test-captcha-token' }),
      })
    })
  })

  it('shows "Check your email" after successful submit', async () => {
    mockSignInWithOtp.mockResolvedValue({ error: null })
    render(<JoinNowForm />)

    fireEvent.click(screen.getByTestId('turnstile-mock'))
    fireEvent.change(screen.getByPlaceholderText('your@email.com'), {
      target: { value: 'user@example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: /join now/i }))

    await waitFor(() => {
      expect(screen.getByText(/check your email/i)).toBeInTheDocument()
    })
  })

  it('shows error message and disables the button again on signInWithOtp error', async () => {
    mockSignInWithOtp.mockResolvedValue({ error: { message: 'Too many requests' } })
    render(<JoinNowForm />)

    fireEvent.click(screen.getByTestId('turnstile-mock'))
    fireEvent.change(screen.getByPlaceholderText('your@email.com'), {
      target: { value: 'user@example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: /join now/i }))

    await waitFor(() => {
      expect(screen.getByText('Too many requests')).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: /join now/i })).toBeDisabled()
  })
})
