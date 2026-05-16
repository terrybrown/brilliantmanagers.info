'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BookOpen, Gauge, PenLine, Library, HelpCircle } from 'lucide-react'
import { siteConfig } from '@/config/site'
import { ThemeToggle } from './theme-toggle'

const NAV_ICONS: Record<string, React.ElementType> = {
  '/the-guide': BookOpen,
  '/the-tool': Gauge,
  '/blog': PenLine,
  '/resources': Library,
  '/the-guide/faq': HelpCircle,
}

const ALWAYS_DARK_ROUTES = ['/', '/the-tool']

export function Nav() {
  const pathname = usePathname()
  const showToggle = !ALWAYS_DARK_ROUTES.includes(pathname)

  return (
    <header
      className="sticky top-0 z-50 border-b"
      style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-base)' }}
    >
      <div
        className="mx-auto flex h-14 items-center justify-between px-6"
        style={{ maxWidth: 'var(--container-width)' }}
      >
        <Link
          href="/"
          className="text-xl font-bold tracking-tight"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)' }}
        >
          Brilliant Managers
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {siteConfig.nav.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            const Icon = NAV_ICONS[item.href]
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-1.5 text-sm font-medium transition-opacity hover:opacity-100"
                style={{ color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}
              >
                {Icon && (
                  <Icon
                    size={14}
                    strokeWidth={1.75}
                    style={{ color: 'var(--color-accent)', flexShrink: 0 }}
                  />
                )}
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="flex items-center gap-3">
          {showToggle && <ThemeToggle />}
          <Link
            href={siteConfig.githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden rounded-md border px-3 py-1.5 text-sm font-medium md:block"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
          >
            GitHub →
          </Link>
        </div>
      </div>
    </header>
  )
}
