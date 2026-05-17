import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { usePathname } from 'next/navigation'
import { Nav } from '@/components/layout/nav'

vi.mock('next/navigation', () => ({ usePathname: vi.fn() }))
vi.mock('@/components/layout/theme-toggle', () => ({
  ThemeToggle: () => <button>Theme</button>,
}))
vi.mock('@/components/app/LogoMark', () => ({
  LogoMark: () => <svg aria-hidden="true" />,
}))
vi.mock('@/config/site', () => ({
  siteConfig: {
    nav: [{ href: '/the-guide', label: 'The Guide' }],
    githubUrl: 'https://github.com/test',
    gaId: 'G-TEST',
  },
}))

beforeEach(() => {
  vi.mocked(usePathname).mockReturnValue('/blog')
})

describe('Nav', () => {
  it('renders a Sign in link pointing to /login', () => {
    render(<Nav isAuthenticated={false} />)
    const link = screen.getByRole('link', { name: /sign in/i })
    expect(link).toBeTruthy()
    expect(link.getAttribute('href')).toBe('/login')
  })

  it('hides the Sign in link on app routes', () => {
    vi.mocked(usePathname).mockReturnValue('/dashboard')
    render(<Nav isAuthenticated={false} />)
    expect(screen.queryByRole('link', { name: /sign in/i })).toBeNull()
  })
})
