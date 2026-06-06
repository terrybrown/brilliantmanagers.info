'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { LucideIcon } from 'lucide-react'

interface NavItemProps {
  href: string
  icon: LucideIcon
  label: string
  isExpanded: boolean
  id?: string
  badge?: number
}

export function NavItem({ href, icon: Icon, label, isExpanded, id, badge }: NavItemProps) {
  const pathname = usePathname()
  const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))

  if (!isExpanded) {
    // Collapsed: icon-only 40×40 pill, no label in DOM
    return (
      <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
        <Link
          id={id}
          href={href}
          aria-current={isActive ? 'page' : undefined}
          title={label}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 40,
            height: 40,
            borderRadius: 8,
            textDecoration: 'none',
            flexShrink: 0,
            transition: 'background 0.15s',
            background: isActive ? 'var(--color-accent-wash2)' : 'transparent',
            color: isActive ? 'var(--color-accent)' : 'var(--color-text-muted)',
          }}
          onMouseEnter={e => {
            if (!isActive) {
              (e.currentTarget as HTMLElement).style.background = 'var(--color-chip-bg)'
            }
          }}
          onMouseLeave={e => {
            if (!isActive) {
              (e.currentTarget as HTMLElement).style.background = 'transparent'
            }
          }}
        >
          <Icon size={18} strokeWidth={1.75} style={{ flexShrink: 0 }} />
        </Link>
        {badge != null && badge > 0 && (
          <span
            style={{
              position: 'absolute',
              top: 6,
              right: 6,
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: 'var(--color-accent)',
              pointerEvents: 'none',
            }}
          />
        )}
      </div>
    )
  }

  // Expanded: full row with active bar indicator + label
  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {isActive && (
        <span
          style={{
            position: 'absolute',
            left: 0,
            top: 8,
            bottom: 8,
            width: 3,
            borderRadius: '0 2px 2px 0',
            background: 'var(--color-accent)',
          }}
        />
      )}
      <Link
        id={id}
        href={href}
        aria-current={isActive ? 'page' : undefined}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          width: '100%',
          height: 40,
          padding: '0 10px',
          borderRadius: 8,
          textDecoration: 'none',
          flexShrink: 0,
          transition: 'background 0.15s',
          background: isActive ? 'var(--color-accent-wash)' : 'transparent',
          color: isActive ? 'var(--color-accent)' : 'var(--color-text-muted)',
        }}
        onMouseEnter={e => {
          if (!isActive) {
            (e.currentTarget as HTMLElement).style.background = 'var(--color-chip-bg)'
          }
        }}
        onMouseLeave={e => {
          if (!isActive) {
            (e.currentTarget as HTMLElement).style.background = 'transparent'
          }
        }}
      >
        <Icon size={18} strokeWidth={1.75} style={{ flexShrink: 0 }} />
        <span
          style={{
            fontSize: 13,
            fontWeight: isActive ? 650 : 500,
            whiteSpace: 'nowrap',
            color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
          }}
        >
          {label}
        </span>
        {badge != null && badge > 0 && (
          <span
            style={{
              marginLeft: 'auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: 20,
              minWidth: 20,
              borderRadius: 10,
              background: 'var(--color-accent)',
              color: 'var(--color-accent-fg)',
              fontSize: 11,
              fontWeight: 600,
              padding: '0 4px',
              lineHeight: 1,
            }}
          >
            {badge >= 10 ? '9+' : badge}
          </span>
        )}
      </Link>
    </div>
  )
}
