import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Topbar } from '@/components/app/Topbar'

vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
  useRouter: () => ({ push: vi.fn() }),
}))
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ auth: { signOut: vi.fn() } }),
}))

const user = { displayName: 'Terry Brown', email: 'terry@test.com', initials: 'TB' }

describe('Topbar', () => {
  it('renders the page title', () => {
    render(<Topbar user={user} showBeta={false} />)
    expect(screen.getByText('Dashboard')).toBeTruthy()
  })

  it('page title uses the display font CSS variable', () => {
    render(<Topbar user={user} showBeta={false} />)
    const title = screen.getByText('Dashboard')
    expect(title.style.fontFamily).toBe('var(--font-display)')
  })
})
