import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import LoginPage from '@/app/login/page'

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: { signInWithOtp: vi.fn().mockResolvedValue({ error: null }) },
  }),
}))

describe('LoginPage', () => {
  it('renders a link to /the-tool#beta-signup for new users', () => {
    render(<LoginPage />)
    const link = screen.getByRole('link', { name: /sign up for the beta/i })
    expect(link).toBeTruthy()
    expect(link.getAttribute('href')).toBe('/the-tool#beta-signup')
  })

  it('the sign-up link is visible in the initial form state', () => {
    render(<LoginPage />)
    expect(screen.getByRole('link', { name: /sign up for the beta/i })).toBeTruthy()
  })
})
