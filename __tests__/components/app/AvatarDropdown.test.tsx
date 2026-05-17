import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AvatarDropdown } from '@/components/app/AvatarDropdown'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))

const user = { displayName: 'Terry Brown', email: 'terry@test.com', initials: 'TB' }

describe('AvatarDropdown', () => {
  it('shows initials when no avatarUrl', () => {
    render(<AvatarDropdown user={user} />)
    expect(screen.getByText('TB')).toBeTruthy()
  })

  it('shows avatar image when avatarUrl provided', () => {
    render(<AvatarDropdown user={{ ...user, avatarUrl: 'https://example.com/avatar.jpg' }} />)
    const img = screen.getByRole('img', { name: 'Terry Brown' })
    expect(img.getAttribute('src')).toBe('https://example.com/avatar.jpg')
    expect(screen.queryByText('TB')).toBeNull()
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

  it('falls back to initials when avatar image fails to load', () => {
    render(<AvatarDropdown user={{ ...user, avatarUrl: 'https://example.com/avatar.jpg' }} />)
    const img = screen.getByRole('img', { name: 'Terry Brown' })
    fireEvent.error(img)
    expect(screen.queryByRole('img')).toBeNull()
    expect(screen.getByText('TB')).toBeTruthy()
  })
})
