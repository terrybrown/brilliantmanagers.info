'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface ResourceNavItemProps {
  href: string
  label: string
  tab?: boolean
}

export function ResourceNavItem({ href, label, tab = false }: ResourceNavItemProps) {
  const pathname = usePathname()
  const isActive = pathname === href

  if (tab) {
    return (
      <Link
        href={href}
        aria-current={isActive ? 'page' : undefined}
        className="flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors"
        style={
          isActive
            ? { background: 'rgba(245,158,11,0.15)', color: 'var(--color-accent)' }
            : { color: 'var(--color-text-muted)' }
        }
      >
        {label}
      </Link>
    )
  }

  return (
    <Link
      href={href}
      aria-current={isActive ? 'page' : undefined}
      className="block rounded-r-md py-2 pr-3 text-sm font-medium transition-colors"
      style={
        isActive
          ? {
              color: 'var(--color-accent)',
              borderLeft: '2px solid var(--color-accent)',
              paddingLeft: '10px',
              background: 'rgba(245,158,11,0.08)',
            }
          : {
              color: 'var(--color-text-muted)',
              borderLeft: '2px solid transparent',
              paddingLeft: '10px',
            }
      }
    >
      {label}
    </Link>
  )
}
