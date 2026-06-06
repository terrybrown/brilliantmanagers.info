'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { User, Bell, LogOut, ChevronDown } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface UserInfo {
  displayName: string
  email: string
  initials: string
  avatarUrl?: string
}

function AvatarImage({ avatarUrl, displayName, initials }: {
  avatarUrl: string
  displayName: string
  initials: string
}) {
  const [imgError, setImgError] = useState(false)
  if (imgError) return <>{initials}</>
  return (
    <img
      src={avatarUrl}
      alt={displayName}
      onError={() => setImgError(true)}
      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
    />
  )
}

interface DropdownPos {
  top?: number
  bottom?: number
  left?: number
  right?: number
  minWidth?: number
}

/**
 * Avatar trigger + dropdown menu.
 *
 * When `isExpanded` is true the component renders the full sidebar user card
 * (avatar + name + email + chevron) as a single clickable button.
 * When false/undefined it renders only the avatar circle (topbar mobile use).
 *
 * The dropdown panel uses `position: fixed` to escape any overflow:hidden
 * ancestor (the AppShell outer div), so it never clips.
 */
export function AvatarDropdown({
  user,
  direction = 'up',
  isExpanded,
}: {
  user: UserInfo
  direction?: 'up' | 'down'
  isExpanded?: boolean
}) {
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [dropdownPos, setDropdownPos] = useState<DropdownPos>({})
  const router = useRouter()

  // Click-outside to close
  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [open])

  // Calculate fixed position from trigger rect when opening
  useEffect(() => {
    if (!open || !triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    if (direction === 'up') {
      setDropdownPos({
        bottom: window.innerHeight - rect.top + 8,
        left: rect.left,
        minWidth: rect.width,
      })
    } else {
      setDropdownPos({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
        minWidth: 220,
      })
    }
  }, [open, direction])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const avatarCircle = (
    <div
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
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      {user.avatarUrl ? (
        <AvatarImage
          key={user.avatarUrl}
          avatarUrl={user.avatarUrl}
          displayName={user.displayName}
          initials={user.initials}
        />
      ) : (
        user.initials
      )}
    </div>
  )

  return (
    <div ref={wrapperRef} style={{ position: 'relative', width: isExpanded ? '100%' : 'auto' }}>
      <button
        ref={triggerRef}
        id="nav-avatar"
        onClick={() => setOpen(o => !o)}
        aria-label="Open user menu"
        aria-expanded={open}
        style={
          isExpanded
            ? {
                width: '100%',
                borderRadius: 10,
                border: `1px solid ${open ? 'var(--color-accent-border)' : 'var(--color-border)'}`,
                background: 'var(--color-surface)',
                padding: 8,
                boxShadow: 'var(--shadow-card)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'border-color 0.15s',
              }
            : {
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
              }
        }
      >
        {isExpanded ? (
          <>
            {avatarCircle}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user.displayName}
              </div>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user.email}
              </div>
            </div>
            <ChevronDown size={14} strokeWidth={1.75} color="var(--color-text-faint)" style={{ flexShrink: 0 }} />
          </>
        ) : (
          user.avatarUrl ? (
            <AvatarImage
              key={user.avatarUrl}
              avatarUrl={user.avatarUrl}
              displayName={user.displayName}
              initials={user.initials}
            />
          ) : (
            user.initials
          )
        )}
      </button>

      {open && (
        <div
          style={{
            position: 'fixed',
            ...dropdownPos,
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 10,
            boxShadow: '0 4px 24px rgba(40,60,45,0.14)',
            zIndex: 9999,
            overflow: 'hidden',
            width: 220,
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
