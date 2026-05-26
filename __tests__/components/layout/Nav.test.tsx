import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { usePathname } from 'next/navigation'
import { Nav } from '@/components/layout/nav'

vi.mock('next/navigation', () => ({ usePathname: vi.fn() }))
vi.mock('@/components/app/LogoMark', () => ({
  LogoMark: () => <svg aria-hidden="true" />,
}))
vi.mock('@/config/site', () => ({
  siteConfig: {
    nav: [
      { href: '/the-guide', label: 'Read the Guide' },
      { href: '/the-tool', label: 'Try the Scorecard', cta: true },
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

  it('links Try the Scorecard to /the-tool when not authenticated', () => {
    render(<Nav isAuthenticated={false} />)
    const toolLink = screen.getByRole('link', { name: /try the scorecard/i })
    expect(toolLink).toHaveAttribute('href', '/the-tool')
  })

  it('links Try the Scorecard to /dashboard when authenticated', () => {
    render(<Nav isAuthenticated={true} />)
    const toolLink = screen.getByRole('link', { name: /try the scorecard/i })
    expect(toolLink).toHaveAttribute('href', '/dashboard')
  })

  it('hides the Sign in link on app routes even when not authenticated', () => {
    vi.mocked(usePathname).mockReturnValue('/dashboard')
    render(<Nav isAuthenticated={false} />)
    expect(screen.queryByRole('link', { name: /sign in/i })).toBeNull()
  })

  it('shows mobile menu panel when hamburger button is clicked', () => {
    render(<Nav isAuthenticated={false} />)
    const burger = screen.getByRole('button', { name: /open menu/i })
    fireEvent.click(burger)
    expect(screen.getByRole('navigation', { name: /mobile menu/i })).toBeTruthy()
  })

  it('hides mobile menu panel when close button is clicked', () => {
    render(<Nav isAuthenticated={false} />)
    fireEvent.click(screen.getByRole('button', { name: /open menu/i }))
    fireEvent.click(screen.getByRole('button', { name: /close menu/i }))
    expect(screen.queryByRole('navigation', { name: /mobile menu/i })).toBeNull()
  })

  it('hides mobile menu panel when a nav link inside it is clicked', () => {
    render(<Nav isAuthenticated={false} />)
    fireEvent.click(screen.getByRole('button', { name: /open menu/i }))
    const mobileNav = screen.getByRole('navigation', { name: /mobile menu/i })
    fireEvent.click(mobileNav.querySelector('a')!)
    expect(screen.queryByRole('navigation', { name: /mobile menu/i })).toBeNull()
  })

  it('renders the CTA nav item with amber background style', () => {
    render(<Nav isAuthenticated={false} />)
    const ctaLink = screen.getAllByRole('link', { name: /try the scorecard/i })[0]
    expect(ctaLink).toHaveStyle({ background: 'rgba(245,158,11,0.12)' })
  })

  it('does not render a non-CTA nav item with amber background style', () => {
    render(<Nav isAuthenticated={false} />)
    const guideLink = screen.getAllByRole('link', { name: /read the guide/i })[0]
    expect(guideLink).not.toHaveStyle({ background: 'rgba(245,158,11,0.12)' })
  })
})
