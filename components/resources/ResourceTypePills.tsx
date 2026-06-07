'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { TYPE_CONFIG } from '@/app/resources/type-config'

export function ResourceTypePills() {
  const pathname = usePathname()

  const pills = [
    { href: '/resources', label: 'All' },
    ...TYPE_CONFIG.map(t => ({ href: `/resources/${t.slug}`, label: t.label })),
  ]

  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
      {pills.map(pill => {
        const isActive = pill.href === '/resources'
          ? pathname === '/resources'
          : pathname === pill.href
        return (
          <Link
            key={pill.href}
            href={pill.href}
            style={
              isActive
                ? {
                    background: 'var(--color-accent)',
                    color: '#fff',
                    border: '1px solid var(--color-accent)',
                    borderRadius: 20,
                    padding: '5px 14px',
                    fontSize: 13,
                    fontWeight: 600,
                    textDecoration: 'none',
                    whiteSpace: 'nowrap',
                  }
                : {
                    background: 'transparent',
                    color: 'var(--color-text-muted)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 20,
                    padding: '5px 14px',
                    fontSize: 13,
                    fontWeight: 500,
                    textDecoration: 'none',
                    whiteSpace: 'nowrap',
                  }
            }
          >
            {pill.label}
          </Link>
        )
      })}
    </div>
  )
}
