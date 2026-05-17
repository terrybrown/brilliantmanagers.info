import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { usePathname } from 'next/navigation'
import { ResourceNavItem } from '@/components/resources/ResourceNavItem'

vi.mock('next/navigation', () => ({ usePathname: vi.fn() }))

describe('ResourceNavItem', () => {
  it('renders a link with the correct label and href', () => {
    vi.mocked(usePathname).mockReturnValue('/resources/articles')
    render(<ResourceNavItem href="/resources/books" label="Books" />)
    const link = screen.getByRole('link', { name: 'Books' })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/resources/books')
  })

  it('sets aria-current="page" when pathname matches href', () => {
    vi.mocked(usePathname).mockReturnValue('/resources/books')
    render(<ResourceNavItem href="/resources/books" label="Books" />)
    expect(screen.getByRole('link', { name: 'Books' })).toHaveAttribute('aria-current', 'page')
  })

  it('does not set aria-current when pathname differs', () => {
    vi.mocked(usePathname).mockReturnValue('/resources/articles')
    render(<ResourceNavItem href="/resources/books" label="Books" />)
    expect(screen.getByRole('link', { name: 'Books' })).not.toHaveAttribute('aria-current')
  })

  it('renders correctly in tab variant', () => {
    vi.mocked(usePathname).mockReturnValue('/resources/books')
    render(<ResourceNavItem href="/resources/books" label="Books" tab />)
    expect(screen.getByRole('link', { name: 'Books' })).toHaveAttribute('aria-current', 'page')
  })
})
