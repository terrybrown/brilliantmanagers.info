import { vi, describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Sidebar } from '../Sidebar'

vi.mock('next/navigation', () => ({
  usePathname: vi.fn().mockReturnValue('/dashboard'),
}))

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode; [k: string]: unknown }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}))

describe('Sidebar admin section', () => {
  it('hides admin nav items when isSuperAdmin is false', () => {
    render(<Sidebar isExpanded={true} onToggle={() => {}} isSuperAdmin={false} />)
    expect(screen.queryByText('Users')).not.toBeInTheDocument()
    expect(screen.queryByText('Audit Log')).not.toBeInTheDocument()
    expect(screen.queryByText('Organisations')).not.toBeInTheDocument()
  })

  it('shows admin nav items when isSuperAdmin is true and sidebar is expanded', () => {
    render(<Sidebar isExpanded={true} onToggle={() => {}} isSuperAdmin={true} />)
    expect(screen.getByText('Users')).toBeInTheDocument()
    expect(screen.getByText('Audit Log')).toBeInTheDocument()
    expect(screen.getByText('Organisations')).toBeInTheDocument()
  })

  it('admin links point to correct routes', () => {
    render(<Sidebar isExpanded={true} onToggle={() => {}} isSuperAdmin={true} />)
    expect(screen.getByText('Users').closest('a')).toHaveAttribute('href', '/admin/users')
    expect(screen.getByText('Audit Log').closest('a')).toHaveAttribute('href', '/admin/audit-log')
    expect(screen.getByText('Organisations').closest('a')).toHaveAttribute('href', '/admin/organisations')
  })
})
