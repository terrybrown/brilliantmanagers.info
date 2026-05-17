import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AvatarDropdown } from '@/components/app/AvatarDropdown'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))

const user = { displayName: 'Terry Brown', email: 'terry@test.com', initials: 'TB' }

describe('AvatarDropdown', () => {
  it('shows initials on the button', () => {
    render(<AvatarDropdown user={user} />)
    expect(screen.getByText('TB')).toBeTruthy()
  })

  it('dropdown is hidden by default', () => {
    render(<AvatarDropdown user={user} />)
    expect(screen.queryByText('Profile & settings')).toBeNull()
  })

  it('opens dropdown on button click', () => {
    render(<AvatarDropdown user={user} />)
    fireEvent.click(screen.getByRole('button', { name: /open user menu/i }))
    expect(screen.getByText('Profile & settings')).toBeTruthy()
  })

  it('closes dropdown on second click', () => {
    render(<AvatarDropdown user={user} />)
    const btn = screen.getByRole('button', { name: /open user menu/i })
    fireEvent.click(btn)
    fireEvent.click(btn)
    expect(screen.queryByText('Profile & settings')).toBeNull()
  })
})
