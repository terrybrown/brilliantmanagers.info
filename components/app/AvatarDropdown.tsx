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
}

export function AvatarDropdown({ user }: { user: UserInfo }) {
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
          border: `2px solid ${open ? '#f59e0b' : '#334155'}`,
          background: '#1f2937',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 12,
          fontWeight: 700,
          color: '#f59e0b',
          cursor: 'pointer',
          transition: 'border-color 0.15s',
        }}
      >
        {user.initials}
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 40,
            right: 0,
            width: 220,
            background: '#1e293b',
            border: '1px solid #334155',
            borderRadius: 10,
            boxShadow: '0 16px 40px rgba(0,0,0,0.5)',
            zIndex: 200,
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #334155' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#f8fafc' }}>
              {user.displayName}
            </div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{user.email}</div>
          </div>

          <DropdownItem href="/profile" icon={User} label="Profile & settings" onClick={() => setOpen(false)} />
          <DropdownItem href="/notifications" icon={Bell} label="Notifications" onClick={() => setOpen(false)} />

          <div style={{ height: 1, background: '#334155' }} />

          <button
            onClick={handleSignOut}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 16px',
              width: '100%',
              fontSize: 13,
              color: '#f87171',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              textAlign: 'left',
            }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(248,113,113,0.1)')}
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
        color: '#94a3b8',
        textDecoration: 'none',
      }}
      onMouseEnter={e => {
        ;(e.currentTarget as HTMLElement).style.background = '#334155'
        ;(e.currentTarget as HTMLElement).style.color = '#f8fafc'
      }}
      onMouseLeave={e => {
        ;(e.currentTarget as HTMLElement).style.background = 'transparent'
        ;(e.currentTarget as HTMLElement).style.color = '#94a3b8'
      }}
    >
      <Icon size={15} strokeWidth={1.75} />
      {label}
    </Link>
  )
}
