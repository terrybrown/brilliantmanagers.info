import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { NavItem } from '@/components/app/NavItem'
import { LayoutDashboard } from 'lucide-react'

vi.mock('next/navigation', () => ({ usePathname: () => '/dashboard' }))

describe('NavItem', () => {
  it('renders label when expanded', () => {
    render(
      <NavItem href="/dashboard" icon={LayoutDashboard} label="Dashboard" isExpanded={true} />
    )
    expect(screen.getByText('Dashboard')).toBeTruthy()
  })

  it('hides label when collapsed', () => {
    render(
      <NavItem href="/dashboard" icon={LayoutDashboard} label="Dashboard" isExpanded={false} />
    )
    expect(screen.queryByText('Dashboard')).toBeNull()
  })

  it('applies active styles when pathname matches href', () => {
    const { container } = render(
      <NavItem href="/dashboard" icon={LayoutDashboard} label="Dashboard" isExpanded={true} />
    )
    const link = container.querySelector('a')
    expect(link?.getAttribute('aria-current')).toBe('page')
  })

  it('does not apply active styles for non-matching pathname', () => {
    const { container } = render(
      <NavItem href="/growth" icon={LayoutDashboard} label="Growth" isExpanded={true} />
    )
    const link = container.querySelector('a')
    expect(link?.getAttribute('aria-current')).toBeNull()
  })
})
