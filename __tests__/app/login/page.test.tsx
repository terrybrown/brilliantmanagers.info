import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

vi.mock('@marsidev/react-turnstile', () => ({
  Turnstile: ({
    onSuccess,
    onExpire,
    onError,
  }: {
    onSuccess: (token: string) => void
    onExpire?: () => void
    onError?: () => void
  }) => (
    <>
      <button type="button" data-testid="turnstile-mock" onClick={() => onSuccess('test-captcha-token')}>
        verify
      </button>
      <button type="button" data-testid="turnstile-expire" onClick={() => onExpire?.()}>
        expire
      </button>
      <button type="button" data-testid="turnstile-error" onClick={() => onError?.()}>
        error
      </button>
    </>
  ),
}))

const mockSignInWithOtp = vi.hoisted(() => vi.fn())
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: { signInWithOtp: mockSignInWithOtp },
  }),
}))

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

import LoginPage from '@/app/login/page'

describe('LoginPage', () => {
  beforeEach(() => {
    mockSignInWithOtp.mockReset()
  })

  it('disables the submit button before Turnstile fires', () => {
    render(<LoginPage />)
    expect(screen.getByRole('button', { name: /send magic link/i })).toBeDisabled()
  })

  it('enables the submit button after Turnstile fires onSuccess', () => {
    render(<LoginPage />)
    fireEvent.click(screen.getByTestId('turnstile-mock'))
    expect(screen.getByRole('button', { name: /send magic link/i })).not.toBeDisabled()
  })

  it('calls signInWithOtp with email and captchaToken on submit', async () => {
    mockSignInWithOtp.mockResolvedValue({ error: null })
    render(<LoginPage />)

    fireEvent.click(screen.getByTestId('turnstile-mock'))
    fireEvent.change(screen.getByPlaceholderText('your@email.com'), {
      target: { value: 'user@example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: /send magic link/i }))

    await waitFor(() => {
      expect(mockSignInWithOtp).toHaveBeenCalledWith({
        email: 'user@example.com',
        options: expect.objectContaining({ captchaToken: 'test-captcha-token' }),
      })
    })
  })

  it('shows "Check your email" and the submitted address after successful submit', async () => {
    mockSignInWithOtp.mockResolvedValue({ error: null })
    render(<LoginPage />)

    fireEvent.click(screen.getByTestId('turnstile-mock'))
    fireEvent.change(screen.getByPlaceholderText('your@email.com'), {
      target: { value: 'user@example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: /send magic link/i }))

    await waitFor(() => {
      expect(screen.getByText(/check your email/i)).toBeInTheDocument()
      expect(screen.getByText('user@example.com')).toBeInTheDocument()
    })
  })

  it('shows error message and disables the button again on signInWithOtp error', async () => {
    mockSignInWithOtp.mockResolvedValue({ error: { message: 'Invalid email' } })
    render(<LoginPage />)

    fireEvent.click(screen.getByTestId('turnstile-mock'))
    fireEvent.change(screen.getByPlaceholderText('your@email.com'), {
      target: { value: 'bad@example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: /send magic link/i }))

    await waitFor(() => {
      expect(screen.getByText('Invalid email')).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: /send magic link/i })).toBeDisabled()
  })

  it('disables the submit button when the token expires', () => {
    render(<LoginPage />)
    fireEvent.click(screen.getByTestId('turnstile-mock'))
    expect(screen.getByRole('button', { name: /send magic link/i })).not.toBeDisabled()
    fireEvent.click(screen.getByTestId('turnstile-expire'))
    expect(screen.getByRole('button', { name: /send magic link/i })).toBeDisabled()
  })

  it('disables the submit button on Turnstile error', () => {
    render(<LoginPage />)
    fireEvent.click(screen.getByTestId('turnstile-mock'))
    expect(screen.getByRole('button', { name: /send magic link/i })).not.toBeDisabled()
    fireEvent.click(screen.getByTestId('turnstile-error'))
    expect(screen.getByRole('button', { name: /send magic link/i })).toBeDisabled()
  })

  it('shows fallback error message and disables the button on network failure', async () => {
    mockSignInWithOtp.mockRejectedValue(new Error('network error'))
    render(<LoginPage />)

    fireEvent.click(screen.getByTestId('turnstile-mock'))
    fireEvent.change(screen.getByPlaceholderText('your@email.com'), {
      target: { value: 'user@example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: /send magic link/i }))

    await waitFor(() => {
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: /send magic link/i })).toBeDisabled()
  })
})
