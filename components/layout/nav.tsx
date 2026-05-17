'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BookOpen, Gauge, PenLine, Library, HelpCircle } from 'lucide-react'
import { siteConfig } from '@/config/site'
import { ThemeToggle } from './theme-toggle'
import { LogoMark } from '@/components/app/LogoMark'

const NAV_ICONS: Record<string, React.ElementType> = {
  '/the-guide': BookOpen,
  '/the-tool': Gauge,
  '/blog': PenLine,
  '/resources': Library,
  '/the-guide/faq': HelpCircle,
}

const ALWAYS_DARK_ROUTES = ['/', '/the-tool']

// Keep in sync with the app router directory structure under app/(app)/
const APP_ROUTES = [
  '/dashboard',
  '/growth',
  '/connections',
  '/organisation',
  '/profile',
  '/scorecard',
  '/results',
  '/manager',
  '/notifications',
]

export function Nav({ isAuthenticated }: { isAuthenticated: boolean }) {
  const pathname = usePathname()
  const showToggle = !ALWAYS_DARK_ROUTES.includes(pathname)
  const isAppRoute = APP_ROUTES.some(r => pathname === r || pathname.startsWith(r + '/'))

  return (
    <header
      className="sticky top-0 z-50 border-b"
      style={{
        borderColor: 'var(--color-border)',
        background: 'color-mix(in srgb, var(--color-bg-base) 90%, black)',
      }}
    >
      <div
        className="mx-auto flex h-14 items-center px-6"
        style={{ maxWidth: 'var(--container-width)' }}
      >
        {/* Left zone — flex-1 keeps brand left-anchored */}
        <div className="flex flex-1 items-center">
          <Link
            href="/"
            className="flex items-center gap-2.5 text-2xl font-bold tracking-tight"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)' }}
          >
            <LogoMark size={36} />
            Brilliant Managers
          </Link>
        </div>

        {/* Centre zone — flex-none; centred because both wings are flex-1 */}
        <nav className="hidden flex-none items-center gap-6 md:flex">
          {siteConfig.nav.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            const Icon = NAV_ICONS[item.href]
            const href = item.href === '/the-tool' && isAuthenticated ? '/dashboard' : item.href
            return (
              <Link
                key={item.href}
                href={href}
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

        {/* Right zone — flex-1 justify-end keeps actions right-anchored */}
        <div className="hidden flex-1 items-center justify-end gap-3 md:flex">
          {showToggle && <ThemeToggle />}
          {!isAuthenticated && !isAppRoute && (
            <Link
              href="/login"
              className="rounded-md border px-3 py-1.5 text-sm font-semibold"
              style={{ borderColor: 'rgba(245,158,11,0.5)', color: '#f59e0b' }}
            >
              Sign in
            </Link>
          )}
          <Link
            href={siteConfig.githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md border px-3 py-1.5 text-sm font-medium"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
          >
            GitHub →
          </Link>
        </div>
      </div>
    </header>
  )
}
