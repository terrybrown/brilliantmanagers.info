'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { LucideIcon } from 'lucide-react'

interface NavItemProps {
  href: string
  icon: LucideIcon
  label: string
  isExpanded: boolean
}

export function NavItem({ href, icon: Icon, label, isExpanded }: NavItemProps) {
  const pathname = usePathname()
  const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))

  return (
    <Link
      href={href}
      aria-current={isActive ? 'page' : undefined}
      title={!isExpanded ? label : undefined}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: isExpanded ? 10 : 0,
        width: isExpanded ? '100%' : 40,
        height: 40,
        padding: isExpanded ? '0 10px' : '0',
        justifyContent: isExpanded ? 'flex-start' : 'center',
        borderRadius: 8,
        textDecoration: 'none',
        flexShrink: 0,
        transition: 'background 0.15s, color 0.15s',
        background: isActive ? 'rgba(245,158,11,0.12)' : 'transparent',
        color: isActive ? '#f59e0b' : '#64748b',
      }}
      onMouseEnter={e => {
        if (!isActive) {
          ;(e.currentTarget as HTMLElement).style.background = '#1f2937'
          ;(e.currentTarget as HTMLElement).style.color = '#94a3b8'
        }
      }}
      onMouseLeave={e => {
        if (!isActive) {
          ;(e.currentTarget as HTMLElement).style.background = 'transparent'
          ;(e.currentTarget as HTMLElement).style.color = '#64748b'
        }
      }}
    >
      <Icon size={18} strokeWidth={1.75} style={{ flexShrink: 0 }} />
      {isExpanded && (
        <span style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap' }}>{label}</span>
      )}
    </Link>
  )
}
