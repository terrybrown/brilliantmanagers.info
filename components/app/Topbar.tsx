'use client'
import { usePathname } from 'next/navigation'
import { AvatarDropdown } from './AvatarDropdown'

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/scorecard': 'Scorecard',
  '/results': 'Results',
  '/connections': 'Connections',
  '/organisation': 'Organisation',
  '/growth': 'Growth',
  '/profile': 'Profile & Settings',
  '/notifications': 'Notifications',
}

function getPageTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname]
  const prefix = Object.keys(PAGE_TITLES).find(k => pathname.startsWith(k + '/'))
  return prefix ? PAGE_TITLES[prefix] : 'Brilliant Managers'
}

interface UserInfo {
  displayName: string
  email: string
  initials: string
}

export function Topbar({ user, showBeta }: { user: UserInfo; showBeta: boolean }) {
  const pathname = usePathname()
  const title = getPageTitle(pathname)

  return (
    <div
      style={{
        height: 52,
        borderBottom: '1px solid #1f2937',
        display: 'flex',
        alignItems: 'center',
        padding: '0 24px',
        gap: 12,
        background: '#0f172a',
        flexShrink: 0,
      }}
    >
      <span style={{ fontWeight: 600, fontSize: 15, color: '#f8fafc', flex: 1 }}>{title}</span>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {showBeta && (
          <span
            style={{
              fontSize: 11,
              padding: '3px 10px',
              borderRadius: 10,
              fontWeight: 600,
              background: 'rgba(245,158,11,0.15)',
              color: '#f59e0b',
            }}
          >
            Beta
          </span>
        )}
        <AvatarDropdown user={user} />
      </div>
    </div>
  )
}
