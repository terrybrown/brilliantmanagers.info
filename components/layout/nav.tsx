'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BookOpen, Gauge, PenLine, Library, HelpCircle, Menu, X } from 'lucide-react'
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

function NavLink({
  item,
  isAuthenticated,
  pathname,
  iconSize,
  className,
  extraStyle,
  onClick,
}: {
  item: (typeof siteConfig.nav)[number]
  isAuthenticated: boolean
  pathname: string
  iconSize: number
  className: string
  extraStyle?: React.CSSProperties
  onClick?: () => void
}) {
  const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
  const Icon = NAV_ICONS[item.href]
  const href = item.href === '/the-tool' && isAuthenticated ? '/dashboard' : item.href
  return (
    <Link
      href={href}
      onClick={onClick}
      className={className}
      style={{ color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-muted)', ...extraStyle }}
    >
      {Icon && (
        <Icon size={iconSize} strokeWidth={1.75} style={{ color: 'var(--color-accent)', flexShrink: 0 }} />
      )}
      {item.label}
    </Link>
  )
}

export function Nav({ isAuthenticated }: { isAuthenticated: boolean }) {
  const pathname = usePathname()
  const showToggle = !ALWAYS_DARK_ROUTES.includes(pathname)
  const isAppRoute = APP_ROUTES.some(r => pathname === r || pathname.startsWith(r + '/'))
  const [isOpen, setIsOpen] = useState(false)
  const headerRef = useRef<HTMLElement>(null)
  const prevPathname = useRef(pathname)

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: MouseEvent | TouchEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('touchstart', handler)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('touchstart', handler)
    }
  }, [isOpen])

  // Close on route change — guard prevents no-op setState on initial mount
  useEffect(() => {
    if (prevPathname.current !== pathname) {
      prevPathname.current = pathname
      setIsOpen(false)
    }
  }, [pathname])

  return (
    <header
      ref={headerRef}
      className="sticky top-0 z-50 border-b"
      style={{
        borderColor: 'var(--color-border)',
        background: 'var(--color-nav-bg)',
      }}
    >
      <div
        className="mx-auto flex h-14 items-center px-6"
        style={{ maxWidth: 'var(--container-width)' }}
      >
        {/* Left zone */}
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

        {/* Centre zone — desktop only */}
        <nav className="hidden flex-none items-center gap-6 md:flex">
          {siteConfig.nav.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              isAuthenticated={isAuthenticated}
              pathname={pathname}
              iconSize={14}
              className="flex items-center gap-1.5 text-sm font-medium transition-opacity hover:opacity-100"
            />
          ))}
        </nav>

        {/* Right zone — desktop only */}
        <div className="hidden flex-1 items-center justify-end gap-3 md:flex">
          {showToggle && <ThemeToggle />}
          {!isAuthenticated && !isAppRoute && (
            <Link
              href="/login"
              className="rounded-md border px-3 py-1.5 text-sm font-semibold"
              style={{ borderColor: 'color-mix(in srgb, var(--color-accent) 50%, transparent)', color: 'var(--color-accent)' }}
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

        {/* Hamburger button — mobile only */}
        <div className="flex flex-1 items-center justify-end md:hidden">
          <button
            aria-label={isOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isOpen ? 'true' : 'false'}
            onClick={() => setIsOpen(!isOpen)}
            className="rounded-md p-2"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {isOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown panel — isOpen is the visibility gate */}
      {isOpen && (
        <nav
          role="navigation"
          aria-label="Mobile menu"
          className="border-t"
          style={{
            borderColor: 'var(--color-border)',
            background: 'var(--color-nav-bg)',
          }}
        >
          {siteConfig.nav.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              isAuthenticated={isAuthenticated}
              pathname={pathname}
              iconSize={16}
              className="flex items-center gap-3 border-b px-6 py-3.5 text-sm font-medium"
              extraStyle={{ borderColor: 'var(--color-border)' }}
              onClick={() => setIsOpen(false)}
            />
          ))}
          <div className="flex items-center justify-between px-6 py-4">
            {!isAuthenticated && !isAppRoute && (
              <Link
                href="/login"
                onClick={() => setIsOpen(false)}
                className="rounded-md border px-4 py-2 text-sm font-semibold"
                style={{ borderColor: 'color-mix(in srgb, var(--color-accent) 50%, transparent)', color: 'var(--color-accent)' }}
              >
                Sign in
              </Link>
            )}
            <div className="ml-auto">
              {showToggle && <ThemeToggle />}
            </div>
          </div>
        </nav>
      )}
    </header>
  )
}
