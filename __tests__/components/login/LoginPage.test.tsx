import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import LoginPage from '@/app/login/page'

const mockSignInWithOtp = vi.fn()
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: { signInWithOtp: mockSignInWithOtp },
  }),
}))

beforeEach(() => {
  mockSignInWithOtp.mockReset()
  mockSignInWithOtp.mockResolvedValue({ error: null })
})

describe('LoginPage', () => {
  it('renders a link to /the-tool#beta-signup for new users', () => {
    render(<LoginPage />)
    const link = screen.getByRole('link', { name: /sign up for the beta/i })
    expect(link).toBeTruthy()
    expect(link.getAttribute('href')).toBe('/the-tool#beta-signup')
  })

  it('hides the sign-up link after the magic link is sent', async () => {
    render(<LoginPage />)
    fireEvent.change(screen.getByPlaceholderText('your@email.com'), {
      target: { value: 'test@example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: /send magic link/i }))
    await waitFor(() => {
      expect(screen.getByText(/check your email/i)).toBeTruthy()
    })
    expect(screen.queryByRole('link', { name: /sign up for the beta/i })).toBeNull()
  })

  it('disables the submit button while sending', async () => {
    let resolve: (v: { error: null }) => void
    mockSignInWithOtp.mockReturnValue(
      new Promise(r => {
        resolve = r
      }),
    )
    render(<LoginPage />)
    fireEvent.change(screen.getByPlaceholderText('your@email.com'), {
      target: { value: 'test@example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: /send magic link/i }))
    expect(screen.getByRole('button', { name: /send magic link/i })).toHaveProperty('disabled', true)
    resolve!({ error: null })
  })
})
