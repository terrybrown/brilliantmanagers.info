import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Nav } from '@/components/layout/nav'

vi.mock('next/navigation', () => ({ usePathname: () => '/blog' }))
vi.mock('@/components/layout/theme-toggle', () => ({
  ThemeToggle: () => <button>Theme</button>,
}))
vi.mock('@/config/site', () => ({
  siteConfig: {
    nav: [{ href: '/the-guide', label: 'The Guide' }],
    githubUrl: 'https://github.com/test',
    gaId: 'G-TEST',
  },
}))

describe('Nav', () => {
  it('renders a Sign in link pointing to /login', () => {
    render(<Nav />)
    const link = screen.getByRole('link', { name: /sign in/i })
    expect(link).toBeTruthy()
    expect(link.getAttribute('href')).toBe('/login')
  })
})
