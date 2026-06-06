'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { User, Bell, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface UserInfo {
  displayName: string
  email: string
  initials: string
  avatarUrl?: string
}

/**
 * Renders the avatar image with its own isolated imgError state.
 * Keying this component on `avatarUrl` in the parent causes it to remount
 * (and reset imgError to false) whenever the URL changes — no effect needed.
 */
function AvatarImage({ avatarUrl, displayName, initials }: {
  avatarUrl: string
  displayName: string
  initials: string
}) {
  const [imgError, setImgError] = useState(false)
  if (imgError) {
    return <>{initials}</>
  }
  return (
    <img
      src={avatarUrl}
      alt={displayName}
      onError={() => setImgError(true)}
      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
    />
  )
}

export function AvatarDropdown({ user, direction = 'up' }: { user: UserInfo; direction?: 'up' | 'down' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [open])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        id="nav-avatar"
        onClick={() => setOpen(o => !o)}
        aria-label="Open user menu"
        aria-expanded={open}
        style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          border: `2px solid ${open ? 'var(--color-accent)' : 'var(--color-border)'}`,
          background: 'var(--color-chip-bg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 12,
          fontWeight: 700,
          color: 'var(--color-accent)',
          cursor: 'pointer',
          transition: 'border-color 0.15s',
          overflow: 'hidden',
          padding: 0,
        }}
      >
        {user.avatarUrl ? (
          // Key on avatarUrl causes AvatarImage to remount when the URL changes,
          // resetting its imgError state naturally without an effect.
          <AvatarImage
            key={user.avatarUrl}
            avatarUrl={user.avatarUrl}
            displayName={user.displayName}
            initials={user.initials}
          />
        ) : (
          user.initials
        )}
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            ...(direction === 'up' ? { bottom: 40 } : { top: 40 }),
            right: 0,
            width: 220,
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 10,
            boxShadow: '0 4px 24px rgba(40,60,45,0.14)',
            zIndex: 200,
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--color-border)' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>
              {user.displayName}
            </div>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>{user.email}</div>
          </div>

          <DropdownItem href="/profile" icon={User} label="Profile & settings" onClick={() => setOpen(false)} />
          <DropdownItem href="/notifications" icon={Bell} label="Notifications" onClick={() => setOpen(false)} />

          <div style={{ height: 1, background: 'var(--color-border)' }} />

          <button
            onClick={handleSignOut}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 16px',
              width: '100%',
              fontSize: 13,
              color: 'var(--color-negative)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              textAlign: 'left',
            }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'var(--color-negative-bg)')}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
          >
            <LogOut size={15} strokeWidth={1.75} />
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}

function DropdownItem({
  href,
  icon: Icon,
  label,
  onClick,
}: {
  href: string
  icon: typeof User
  label: string
  onClick: () => void
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 16px',
        fontSize: 13,
        color: 'var(--color-text-muted)',
        textDecoration: 'none',
      }}
      onMouseEnter={e => {
        ;(e.currentTarget as HTMLElement).style.background = 'var(--color-chip-bg)'
        ;(e.currentTarget as HTMLElement).style.color = 'var(--color-text-primary)'
      }}
      onMouseLeave={e => {
        ;(e.currentTarget as HTMLElement).style.background = 'transparent'
        ;(e.currentTarget as HTMLElement).style.color = 'var(--color-text-muted)'
      }}
    >
      <Icon size={15} strokeWidth={1.75} />
      {label}
    </Link>
  )
}
