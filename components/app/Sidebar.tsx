'use client'
import {
  LayoutDashboard,
  TrendingUp,
  Link2,
  Network,
} from 'lucide-react'
import { NavItem } from './NavItem'

const NAV_ITEMS = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', id: 'nav-dashboard' },
  { href: '/growth', icon: TrendingUp, label: 'Growth', id: 'nav-growth' },
  { href: '/connections', icon: Link2, label: 'Connections', id: 'nav-connections' },
  { href: '/organisation', icon: Network, label: 'Organisation' },
] as const

interface SidebarProps {
  isExpanded: boolean
  onToggle: () => void
}

export function Sidebar({ isExpanded, onToggle }: SidebarProps) {
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

      <div style={{ flex: 1 }} />

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
