'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, TrendingUp, History, Network, Bell } from 'lucide-react'

const TABS = [
  { href: '/dashboard',     icon: LayoutDashboard, label: 'Home'   },
  { href: '/growth',        icon: TrendingUp,      label: 'Growth' },
  { href: '/reflections',   icon: History,         label: 'Rounds' },
  { href: '/people',        icon: Network,         label: 'Team'   },
  { href: '/notifications', icon: Bell,            label: 'Alerts' },
] as const

export function BottomTabBar({ unreadCount }: { unreadCount?: number }) {
  const pathname = usePathname()
  return (
    <nav
      aria-label="Mobile navigation"
      style={{
        borderTop: '1px solid var(--color-border)',
        background: 'var(--color-surface)',
        display: 'flex',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {TABS.map(({ href, icon: Icon, label }) => {
        const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
        const showBadge = href === '/notifications' && (unreadCount ?? 0) > 0
        return (
          <Link
            key={href}
            href={href}
            aria-current={isActive ? 'page' : undefined}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 3,
              padding: '10px 4px',
              minHeight: 44,
              textDecoration: 'none',
              color: isActive ? 'var(--color-accent)' : 'var(--color-text-faint)',
              position: 'relative' as const,
            }}
          >
            <div style={{ position: 'relative' as const }}>
              <Icon size={22} strokeWidth={isActive ? 2 : 1.75} />
              {showBadge && (
                <span style={{
                  position: 'absolute', top: -2, right: -3,
                  width: 7, height: 7, borderRadius: '50%',
                  background: 'var(--color-accent)',
                  border: '1.5px solid var(--color-surface)',
                }} />
              )}
            </div>
            <span style={{ fontSize: 10, fontWeight: isActive ? 700 : 500 }}>{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
