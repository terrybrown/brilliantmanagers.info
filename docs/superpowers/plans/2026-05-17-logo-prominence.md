# Logo Prominence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the LogoMark (36 px) into the persistent top nav bar, remove the redundant logo from the app sidebar, and redirect authenticated users from "The Tool" nav link to `/dashboard`.

**Architecture:** The root layout (`app/layout.tsx`) is a server component — it performs a single Supabase auth check and passes `isAuthenticated` as a prop to the client-side `Nav`. The Nav adds the LogoMark to its brand link and conditionally rewrites the Tool href. The Sidebar simply has its logo block stripped.

**Tech Stack:** Next.js 15 App Router, Supabase SSR (`@/lib/supabase/server`), Tailwind CSS, inline styles (existing pattern), SVG LogoMark component.

**Spec:** `docs/superpowers/specs/2026-05-17-logo-prominence-design.md`

---

## File Map

| File | Change |
|---|---|
| `app/layout.tsx` | Make async; add Supabase auth check; pass `isAuthenticated` to `<Nav />` |
| `components/layout/nav.tsx` | Accept `isAuthenticated` prop; add LogoMark (36 px) to brand link; conditional Tool href |
| `components/app/Sidebar.tsx` | Remove logo/brand block and LogoMark import |

---

### Task 1: Update Nav — add LogoMark and isAuthenticated prop

**Files:**
- Modify: `components/layout/nav.tsx`

- [ ] **Step 1: Replace the file contents**

  Replace the entire file with the following. Changes from current: (1) `LogoMark` import added, (2) `Nav` now accepts `{ isAuthenticated: boolean }`, (3) brand `<Link>` gets `flex items-center gap-2.5` and `<LogoMark size={36} />` prepended, (4) nav link map computes `href` with Tool redirect logic.

  ```tsx
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
        style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-base)' }}
      >
        <div
          className="mx-auto flex h-14 items-center justify-between px-6"
          style={{ maxWidth: 'var(--container-width)' }}
        >
          <Link
            href="/"
            className="flex items-center gap-2.5 text-xl font-bold tracking-tight"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)' }}
          >
            <LogoMark size={36} />
            Brilliant Managers
          </Link>

          <nav className="hidden items-center gap-6 md:flex">
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

          <div className="flex items-center gap-3">
            {showToggle && <ThemeToggle />}
            {!isAppRoute && (
              <Link
                href="/login"
                className="hidden rounded-md border px-3 py-1.5 text-sm font-semibold md:block"
                style={{ borderColor: 'rgba(245,158,11,0.5)', color: '#f59e0b' }}
              >
                Sign in
              </Link>
            )}
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
  ```

- [ ] **Step 2: Verify TypeScript compiles**

  ```bash
  npx tsc --noEmit
  ```

  Expected: no errors. If you see `Property 'isAuthenticated' does not exist`, the root layout hasn't been updated yet — that's fine, fix it in Task 2 and re-run.

- [ ] **Step 3: Commit**

  ```bash
  git add components/layout/nav.tsx
  git commit -m "feat: add LogoMark to nav bar and accept isAuthenticated prop"
  ```

---

### Task 2: Pass isAuthenticated from root layout

**Files:**
- Modify: `app/layout.tsx`

- [ ] **Step 1: Replace the file contents**

  Replace the entire file with the following. Changes from current: (1) `createClient` import added, (2) `RootLayout` is now `async`, (3) auth check runs before render, (4) `isAuthenticated` passed to `<Nav />`.

  ```tsx
  import type { Metadata } from 'next'
  import { Fraunces, Inter } from 'next/font/google'
  import Script from 'next/script'
  import { ThemeProvider } from 'next-themes'
  import { Nav } from '@/components/layout/nav'
  import { Footer } from '@/components/layout/footer'
  import { siteConfig } from '@/config/site'
  import { createClient } from '@/lib/supabase/server'
  import './globals.css'

  const fraunces = Fraunces({
    subsets: ['latin'],
    axes: ['opsz', 'SOFT', 'WONK'],
    variable: '--font-fraunces',
    display: 'swap',
  })

  const inter = Inter({
    subsets: ['latin'],
    variable: '--font-inter',
    display: 'swap',
  })

  export const metadata: Metadata = {
    title: {
      default: siteConfig.title,
      template: `%s — ${siteConfig.title}`,
    },
    description: siteConfig.description,
  }

  export default async function RootLayout({ children }: { children: React.ReactNode }) {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    return (
      <html lang="en" suppressHydrationWarning>
        <body className={`${fraunces.variable} ${inter.variable}`}>
          <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
            <div className="flex min-h-screen flex-col">
              <Nav isAuthenticated={!!user} />
              <main className="flex-1">{children}</main>
              <Footer />
            </div>
          </ThemeProvider>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${siteConfig.gaId}`}
            strategy="afterInteractive"
          />
          <Script id="ga-init" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${siteConfig.gaId}',{anonymize_ip:true})`}
          </Script>
        </body>
      </html>
    )
  }
  ```

- [ ] **Step 2: Verify TypeScript compiles clean**

  ```bash
  npx tsc --noEmit
  ```

  Expected: no errors.

- [ ] **Step 3: Smoke-test in the browser**

  ```bash
  npm run dev
  ```

  Open `http://localhost:3000`. Verify:
  - Orange logo mark (36 px) appears to the left of "Brilliant Managers" in the nav bar on every page
  - Logged-out: clicking "The Tool" goes to `/the-tool`
  - Logged-in: clicking "The Tool" goes to `/dashboard`

- [ ] **Step 4: Commit**

  ```bash
  git add app/layout.tsx
  git commit -m "feat: pass isAuthenticated to Nav from root layout"
  ```

---

### Task 3: Remove logo from Sidebar

**Files:**
- Modify: `components/app/Sidebar.tsx`

- [ ] **Step 1: Replace the file contents**

  Replace the entire file with the following. Changes from current: `LogoMark` import removed; the logo `<div>` block (lines 43–69 in the original) is deleted; nav items are the first rendered children.

  ```tsx
  'use client'
  import {
    LayoutDashboard,
    TrendingUp,
    Link2,
    Network,
  } from 'lucide-react'
  import { NavItem } from './NavItem'

  const NAV_ITEMS = [
    { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/growth', icon: TrendingUp, label: 'Growth' },
    { href: '/connections', icon: Link2, label: 'Connections' },
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
  ```

- [ ] **Step 2: Verify TypeScript compiles clean**

  ```bash
  npx tsc --noEmit
  ```

  Expected: no errors.

- [ ] **Step 3: Smoke-test the dashboard**

  With `npm run dev` still running, log in and open `http://localhost:3000/dashboard`. Verify:
  - Sidebar shows nav items (Dashboard, Growth, Connections, Organisation) starting from the top — no logo block above them
  - Sidebar still collapses/expands correctly with the toggle button
  - Logo appears only in the top nav bar

- [ ] **Step 4: Commit**

  ```bash
  git add components/app/Sidebar.tsx
  git commit -m "feat: remove logo from sidebar — now lives in top nav only"
  ```
