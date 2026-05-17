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
    nav: [
      { href: '/the-guide', label: 'The Guide' },
      { href: '/the-tool', label: 'The Tool' },
    ],
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

  it('hides the Sign in link when authenticated', () => {
    render(<Nav isAuthenticated={true} />)
    expect(screen.queryByRole('link', { name: /sign in/i })).toBeNull()
  })

  it('links The Tool to /the-tool when not authenticated', () => {
    render(<Nav isAuthenticated={false} />)
    const toolLink = screen.getByRole('link', { name: /the tool/i })
    expect(toolLink).toHaveAttribute('href', '/the-tool')
  })

  it('links The Tool to /dashboard when authenticated', () => {
    render(<Nav isAuthenticated={true} />)
    const toolLink = screen.getByRole('link', { name: /the tool/i })
    expect(toolLink).toHaveAttribute('href', '/dashboard')
  })

  it('hides the Sign in link on app routes even when not authenticated', () => {
    vi.mocked(usePathname).mockReturnValue('/dashboard')
    render(<Nav isAuthenticated={false} />)
    expect(screen.queryByRole('link', { name: /sign in/i })).toBeNull()
  })
})
