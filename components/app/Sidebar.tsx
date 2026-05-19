'use client'
import {
  LayoutDashboard,
  TrendingUp,
  Network,
  Users,
  ScrollText,
  Building2,
} from 'lucide-react'
import { NavItem } from './NavItem'

const NAV_ITEMS = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', id: 'nav-dashboard' },
  { href: '/growth', icon: TrendingUp, label: 'Growth', id: 'nav-growth' },
  { href: '/people', icon: Network, label: 'Team & Org', id: 'nav-people' },
] as const

const ADMIN_NAV_ITEMS = [
  { href: '/admin/users', icon: Users, label: 'Users', id: 'nav-admin-users' },
  { href: '/admin/audit-log', icon: ScrollText, label: 'Audit Log', id: 'nav-admin-audit' },
  { href: '/admin/organisations', icon: Building2, label: 'Organisations', id: 'nav-admin-orgs' },
] as const

interface SidebarProps {
  isExpanded: boolean
  onToggle: () => void
  isSuperAdmin?: boolean
}

export function Sidebar({ isExpanded, onToggle, isSuperAdmin = false }: SidebarProps) {
  return (
    <div
      style={{
        width: isExpanded ? 220 : 56,
        background: '#111827',
        borderRight: '1px solid #1f2937',
        display: 'flex',
        flexDirection: 'column',
        alignItems: isExpanded ? 'flex-start' : 'center',
        padding: isExpanded ? '12px 8px' : '12px 0',
        gap: 4,
        flexShrink: 0,
        position: 'relative',
        transition: 'width 0.2s ease',
        overflow: 'hidden',
      }}
    >
      {NAV_ITEMS.map(item => (
        <NavItem
          key={item.href}
          href={item.href}
          icon={item.icon}
          label={item.label}
          isExpanded={isExpanded}
          id={'id' in item ? item.id : undefined}
        />
      ))}

      {isSuperAdmin && (
        <>
          <div
            style={{
              width: '100%',
              height: 1,
              background: '#1f2937',
              margin: '12px 0 4px',
              flexShrink: 0,
            }}
          />
          {isExpanded && (
            <span
              style={{
                fontSize: 10,
                color: '#4b5563',
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
          background: '#1f2937',
          border: '1px solid #334155',
          borderRadius: '50%',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 10,
          color: '#64748b',
          zIndex: 10,
        }}
      >
        {isExpanded ? '‹' : '›'}
      </button>
    </div>
  )
}
