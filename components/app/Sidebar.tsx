'use client'
import {
  LayoutDashboard,
  TrendingUp,
  History,
  Network,
  Bell,
  Users,
  ScrollText,
  Building2,
  BookOpen,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { NavItem } from './NavItem'
import { LogoMark } from './LogoMark'
import { AvatarDropdown } from './AvatarDropdown'

const NAV_ITEMS = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', id: 'nav-dashboard' },
  { href: '/growth', icon: TrendingUp, label: 'Growth', id: 'nav-growth' },
  { href: '/reflections', icon: History, label: 'Reflections', id: 'nav-reflections' },
  { href: '/people', icon: Network, label: 'Team & Org', id: 'nav-people' },
] as const

const ADMIN_NAV_ITEMS = [
  { href: '/admin/users', icon: Users, label: 'Users', id: 'nav-admin-users' },
  { href: '/admin/audit-log', icon: ScrollText, label: 'Audit Log', id: 'nav-admin-audit' },
  { href: '/admin/organisations', icon: Building2, label: 'Organisations', id: 'nav-admin-orgs' },
] as const

interface UserInfo {
  displayName: string
  email: string
  initials: string
  avatarUrl?: string
}

interface SidebarProps {
  isExpanded: boolean
  onToggle: () => void
  isSuperAdmin?: boolean
  unreadCount?: number
  user?: UserInfo
}

export function Sidebar({ isExpanded, onToggle, isSuperAdmin = false, unreadCount, user }: SidebarProps) {
  return (
    <div
      style={{
        width: isExpanded ? 232 : 68,
        background: 'var(--color-nav-bg)',
        borderRight: '1px solid var(--color-border)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: isExpanded ? 'flex-start' : 'center',
        padding: isExpanded ? '16px 12px' : '16px 0',
        gap: 2,
        flexShrink: 0,
        position: 'relative',
        transition: 'width 0.2s ease',
        zIndex: 10,
      }}
    >
      {/* Brand / wordmark */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: isExpanded ? '0 4px 16px' : '0 0 16px',
          width: '100%',
          justifyContent: isExpanded ? 'flex-start' : 'center',
          flexShrink: 0,
        }}
      >
        <LogoMark size={30} />
        {isExpanded && (
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 14,
              fontWeight: 700,
              color: 'var(--color-text-primary)',
              whiteSpace: 'nowrap',
              letterSpacing: '-0.01em',
            }}
          >
            Brilliant Managers
          </span>
        )}
      </div>

      {/* Main nav */}
      {NAV_ITEMS.map(item => (
        <NavItem
          key={item.href}
          href={item.href}
          icon={item.icon}
          label={item.label}
          isExpanded={isExpanded}
          id={item.id}
        />
      ))}
      <NavItem
        href="/notifications"
        icon={Bell}
        label="Notifications"
        isExpanded={isExpanded}
        id="nav-notifications"
        badge={unreadCount}
      />

      {/* Spacer pushes bottom content down */}
      <div style={{ flex: 1 }} />

      {/* Admin section */}
      {isSuperAdmin && (
        <>
          <div
            style={{
              width: '100%',
              height: 1,
              background: 'var(--color-border)',
              margin: '12px 0 4px',
              flexShrink: 0,
            }}
          />
          {isExpanded && (
            <span
              style={{
                fontSize: 10,
                color: 'var(--color-text-faint)',
                padding: '2px 10px',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                fontWeight: 600,
              }}
            >
              Admin
            </span>
          )}
          {ADMIN_NAV_ITEMS.map(item => (
            <NavItem
              key={item.href}
              href={item.href}
              icon={item.icon}
              label={item.label}
              isExpanded={isExpanded}
              id={item.id}
            />
          ))}
        </>
      )}

      {/* Read the Guide link — expanded only */}
      {isExpanded && (
        <a
          href="/the-guide"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 10px',
            borderRadius: 8,
            textDecoration: 'none',
            fontSize: 12,
            color: 'var(--color-text-muted)',
            width: '100%',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.background = 'var(--color-chip-bg)'
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.background = 'transparent'
          }}
        >
          <BookOpen size={15} strokeWidth={1.75} />
          Read the Guide
        </a>
      )}

      {/* User card */}
      {user && (
        <div
          style={{
            width: '100%',
            borderRadius: 10,
            border: '1px solid var(--color-border)',
            background: 'var(--color-surface)',
            padding: 8,
            marginTop: 4,
            boxShadow: 'var(--shadow-card)',
            display: 'flex',
            alignItems: 'center',
            gap: isExpanded ? 8 : 0,
            justifyContent: isExpanded ? 'flex-start' : 'center',
            flexShrink: 0,
          }}
        >
          <AvatarDropdown user={user} />
          {isExpanded && (
            <>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: 'var(--color-text-primary)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {user.displayName}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: 'var(--color-text-muted)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {user.email}
                </div>
              </div>
              <ChevronDown size={14} strokeWidth={1.75} color="var(--color-text-faint)" style={{ flexShrink: 0 }} />
            </>
          )}
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={onToggle}
        aria-label={isExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
        style={{
          position: 'absolute',
          right: -10,
          top: '50%',
          transform: 'translateY(-50%)',
          width: 20,
          height: 20,
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '50%',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 10,
          color: 'var(--color-text-muted)',
          zIndex: 10,
        }}
      >
        {isExpanded
          ? <ChevronLeft size={12} strokeWidth={2} />
          : <ChevronRight size={12} strokeWidth={2} />
        }
      </button>
    </div>
  )
}
