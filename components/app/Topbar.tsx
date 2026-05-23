'use client'
import { usePathname } from 'next/navigation'
import { AvatarDropdown } from './AvatarDropdown'
import { MANAGER_TOUR_EVENT } from '@/components/dashboard/DashboardManagerTour'

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/scorecard': 'Scorecard',
  '/results': 'Results',
  '/people': 'Team & Org',
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
  avatarUrl?: string
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
      <span style={{ fontWeight: 600, fontSize: 14, color: '#f8fafc', fontFamily: 'var(--font-display)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</span>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto', flexShrink: 0 }}>
        {pathname === '/dashboard' && (
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent(MANAGER_TOUR_EVENT))}
            style={{
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 8,
              padding: '4px 12px',
              fontSize: 12,
              fontWeight: 500,
              color: 'rgba(255,255,255,0.45)',
              cursor: 'pointer',
              lineHeight: 1.5,
            }}
          >
            Tour
          </button>
        )}
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
