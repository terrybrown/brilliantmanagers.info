'use client'
import { usePathname } from 'next/navigation'
import { MANAGER_TOUR_EVENT } from '@/components/dashboard/DashboardManagerTour'
import { AvatarDropdown } from './AvatarDropdown'

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

function getPageBreadcrumb(pathname: string): string {
  const title = getPageTitle(pathname)
  return title !== 'Brilliant Managers' ? title : 'App'
}

interface UserInfo {
  displayName: string
  email: string
  initials: string
  avatarUrl?: string
}

export function Topbar({ user, showBeta }: { user?: UserInfo; showBeta: boolean }) {
  const pathname = usePathname()
  const title = getPageTitle(pathname)

  return (
    <div
      style={{
        height: 60,
        borderBottom: '1px solid var(--color-border)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 24px',
        gap: 12,
        background: 'var(--color-surface)',
        flexShrink: 0,
      }}
    >
      {/* Left: breadcrumb + page title */}
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 0 }}>
        <span
          style={{
            fontSize: 11.5,
            color: 'var(--color-text-faint)',
            whiteSpace: 'nowrap',
            lineHeight: 1.2,
          }}
        >
          Workspace / {getPageBreadcrumb(pathname)}
        </span>
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 18,
            fontWeight: 700,
            color: 'var(--color-text-primary)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            lineHeight: 1.25,
          }}
        >
          {title}
        </span>
      </div>

      {/* Right: search pill + optional actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto', flexShrink: 0 }}>
        {/* Avatar — shown only on mobile (sidebar is hidden on mobile) */}
        {user && (
          <div className="lg:hidden">
            <AvatarDropdown user={user} direction="down" />
          </div>
        )}
        {/* Search pill — hidden on mobile */}
        <div
          className="hidden sm:flex"
          style={{
            width: 190,
            height: 34,
            borderRadius: 8,
            border: '1px solid var(--color-border)',
            background: 'var(--color-bg-base)',
            alignItems: 'center',
            padding: '0 12px',
            gap: 8,
            fontSize: 12,
            color: 'var(--color-text-faint)',
            cursor: 'default',
            userSelect: 'none',
          }}
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden>
            <circle cx="5.5" cy="5.5" r="4" stroke="currentColor" strokeWidth="1.5" />
            <path d="M8.5 8.5L11 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <span style={{ flex: 1 }}>Search…</span>
          <span
            style={{
              fontSize: 10,
              padding: '1px 5px',
              borderRadius: 4,
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-faint)',
              lineHeight: 1.5,
            }}
          >
            ⌘K
          </span>
        </div>

        {pathname === '/dashboard' && (
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent(MANAGER_TOUR_EVENT))}
            style={{
              background: 'transparent',
              border: '1px solid var(--color-border)',
              borderRadius: 8,
              padding: '4px 12px',
              fontSize: 12,
              fontWeight: 500,
              color: 'var(--color-text-muted)',
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
              background: 'var(--color-accent-wash2)',
              color: 'var(--color-accent)',
            }}
          >
            Beta
          </span>
        )}
      </div>
    </div>
  )
}
