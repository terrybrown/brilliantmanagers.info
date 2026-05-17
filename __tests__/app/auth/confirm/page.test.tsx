import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import AuthConfirmPage from '@/app/auth/confirm/page'

// next/navigation redirect throws a Next.js-internal error in tests
vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`)
  }),
}))

// server action is not exercised in render tests
vi.mock('@/app/auth/confirm/actions', () => ({
  confirmLogin: vi.fn(),
}))

describe('AuthConfirmPage', () => {
  it('renders the complete sign-in button when a code is present', async () => {
    render(await AuthConfirmPage({ searchParams: { code: 'test-code-123' } }))
    expect(screen.getByRole('heading', { name: /complete your sign-in/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeTruthy()
  })

  it('renders the error state when an error param is present', async () => {
    render(
      await AuthConfirmPage({
        searchParams: {
          error: 'access_denied',
          error_description: 'Email link is invalid or has expired',
        },
      })
    )
    expect(screen.getByRole('heading', { name: /link expired/i })).toBeTruthy()
    expect(screen.getByText(/invalid or has expired/i)).toBeTruthy()
    expect(screen.getByRole('link', { name: /back to sign in/i })).toBeTruthy()
  })

  it('redirects to /login when neither code nor error is present', async () => {
    await expect(AuthConfirmPage({ searchParams: {} })).rejects.toThrow(
      'NEXT_REDIRECT:/login'
    )
  })
})
