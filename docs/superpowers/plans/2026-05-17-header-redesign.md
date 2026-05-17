# Header Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign `components/layout/nav.tsx` to use a three-zone desktop layout with a larger brand, a 10%-darker header background, and a mobile hamburger menu.

**Architecture:** Single-file change to `components/layout/nav.tsx`. Desktop layout uses `flex-1` on both the brand zone and the actions zone so the nav column sits at the true geometric centre. Mobile adds `useState` for a conditionally-rendered dropdown panel and a `useRef`+`useEffect` pair for click-outside dismissal.

**Tech Stack:** React 18, Next.js 14 App Router, Tailwind CSS, Lucide React, Vitest + @testing-library/react

---

## File map

| File | Change |
|---|---|
| `components/layout/nav.tsx` | Full rewrite — desktop layout, background colour, hamburger, dropdown |
| `__tests__/components/layout/Nav.test.tsx` | Add 3 mobile-menu tests; add `fireEvent` to existing import |

---

### Task 1: Write failing mobile menu tests (RED)

**Files:**
- Modify: `__tests__/components/layout/Nav.test.tsx`

- [ ] **Step 1: Add `fireEvent` to the import and append three new tests**

Replace the first line of the imports and add the three tests at the end of the `describe` block. Everything else in the file stays unchanged.

```tsx
// Change this line:
import { render, screen } from '@testing-library/react'
// To:
import { render, screen, fireEvent } from '@testing-library/react'
```

Add these three tests inside the existing `describe('Nav', () => { ... })` block, after the last existing test:

```tsx
  it('shows mobile menu panel when hamburger button is clicked', () => {
    render(<Nav isAuthenticated={false} />)
    const burger = screen.getByRole('button', { name: /open menu/i })
    fireEvent.click(burger)
    expect(screen.getByRole('navigation', { name: /mobile menu/i })).toBeTruthy()
  })

  it('hides mobile menu panel when close button is clicked', () => {
    render(<Nav isAuthenticated={false} />)
    fireEvent.click(screen.getByRole('button', { name: /open menu/i }))
    fireEvent.click(screen.getByRole('button', { name: /close menu/i }))
    expect(screen.queryByRole('navigation', { name: /mobile menu/i })).toBeNull()
  })

  it('hides mobile menu panel when a nav link inside it is clicked', () => {
    render(<Nav isAuthenticated={false} />)
    fireEvent.click(screen.getByRole('button', { name: /open menu/i }))
    const mobileNav = screen.getByRole('navigation', { name: /mobile menu/i })
    fireEvent.click(mobileNav.querySelector('a')!)
    expect(screen.queryByRole('navigation', { name: /mobile menu/i })).toBeNull()
  })
```

- [ ] **Step 2: Run tests and confirm the 3 new ones fail**

```bash
npm run test 2>&1 | grep -E "Tests|Test Files"
```

Expected:
```
 Test Files  1 failed, 32 passed (33)
      Tests  3 failed, 165 passed (168)
```

The 3 failures should report: `Unable to find an accessible element with the role "button" and name "/open menu/i"`.

- [ ] **Step 3: Commit the red tests**

```bash
git add __tests__/components/layout/Nav.test.tsx
git commit -m "test: add failing mobile menu tests (red)"
```

---

### Task 2: Desktop layout — three zones, brand size, darker background

**Files:**
- Modify: `components/layout/nav.tsx`

- [ ] **Step 1: Replace `components/layout/nav.tsx` with the desktop-only update**

This step makes the three structural changes (brand size, three-zone layout, background colour) without adding mobile logic yet.

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
```

- [ ] **Step 2: Run tests — original 165 pass, 3 new still fail**

```bash
npm run test 2>&1 | grep -E "Tests|Test Files"
```

Expected:
```
 Test Files  1 failed, 32 passed (33)
      Tests  3 failed, 165 passed (168)
```

- [ ] **Step 3: Commit the desktop changes**

```bash
git add components/layout/nav.tsx
git commit -m "feat: three-zone desktop layout, text-2xl brand, color-mix header background"
```

---

### Task 3: Add mobile hamburger button and dropdown panel

**Files:**
- Modify: `components/layout/nav.tsx`

- [ ] **Step 1: Replace `components/layout/nav.tsx` with the full mobile implementation**

```tsx
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

export function Nav({ isAuthenticated }: { isAuthenticated: boolean }) {
  const pathname = usePathname()
  const showToggle = !ALWAYS_DARK_ROUTES.includes(pathname)
  const isAppRoute = APP_ROUTES.some(r => pathname === r || pathname.startsWith(r + '/'))
  const [isOpen, setIsOpen] = useState(false)
  const headerRef = useRef<HTMLElement>(null)

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

  // Close on route change (Next.js navigation)
  useEffect(() => {
    setIsOpen(false)
  }, [pathname])

  return (
    <header
      ref={headerRef}
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

        {/* Right zone — desktop only */}
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

        {/* Hamburger button — mobile only */}
        <div className="flex flex-1 items-center justify-end md:hidden">
          <button
            aria-label={isOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isOpen}
            onClick={() => setIsOpen(!isOpen)}
            className="rounded-md p-2"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {isOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown panel — conditionally rendered, not hidden */}
      {isOpen && (
        <nav
          role="navigation"
          aria-label="Mobile menu"
          className="border-t md:hidden"
          style={{
            borderColor: 'var(--color-border)',
            background: 'color-mix(in srgb, var(--color-bg-base) 90%, black)',
          }}
        >
          {siteConfig.nav.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            const Icon = NAV_ICONS[item.href]
            const href = item.href === '/the-tool' && isAuthenticated ? '/dashboard' : item.href
            return (
              <Link
                key={item.href}
                href={href}
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 border-b px-6 py-3.5 text-sm font-medium"
                style={{
                  color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                  borderColor: 'var(--color-border)',
                }}
              >
                {Icon && (
                  <Icon
                    size={16}
                    strokeWidth={1.75}
                    style={{ color: 'var(--color-accent)', flexShrink: 0 }}
                  />
                )}
                {item.label}
              </Link>
            )
          })}
          <div className="flex items-center justify-between px-6 py-4">
            {!isAuthenticated && !isAppRoute && (
              <Link
                href="/login"
                onClick={() => setIsOpen(false)}
                className="rounded-md border px-4 py-2 text-sm font-semibold"
                style={{ borderColor: 'rgba(245,158,11,0.5)', color: '#f59e0b' }}
              >
                Sign in
              </Link>
            )}
            {showToggle && <ThemeToggle />}
          </div>
        </nav>
      )}
    </header>
  )
}
```

- [ ] **Step 2: Run the full test suite — all 168 tests should pass**

```bash
npm run test 2>&1 | grep -E "Tests|Test Files"
```

Expected:
```
 Test Files  33 passed (33)
      Tests  168 passed (168)
```

- [ ] **Step 3: Commit**

```bash
git add components/layout/nav.tsx
git commit -m "feat: add mobile hamburger menu with dropdown panel"
```

---

### Task 4: Visual verification

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

Open http://localhost:3000.

- [ ] **Step 2: Verify desktop layout**

On a wide browser window (≥ 768px), confirm:
- "Brilliant Managers" brand text is visibly larger than the nav links
- The five nav links (The Guide, The Tool, Blog, Resources, FAQ) sit in the centre of the bar
- Sign in and GitHub → buttons are flush against the right edge
- The header bar is a noticeably darker shade of blue than the page body behind it

- [ ] **Step 3: Verify mobile layout**

In DevTools (⌘+⇧+M on Chrome / F12 → toggle device toolbar on Firefox), set viewport to 390 × 844 (iPhone 14 size).

- Desktop nav links and right-zone buttons should be invisible (CSS `hidden`)
- Hamburger icon (☰) appears in the top-right of the header
- Tap / click the hamburger: dropdown panel slides down showing all 5 nav items + Sign in button + theme toggle; hamburger becomes ✕
- Tap ✕: panel closes; ✕ becomes ☰
- Tap any nav link: panel closes and the page navigates

- [ ] **Step 4: Verify authenticated state**

Sign in with a test account and confirm:
- Sign in button is absent from both the desktop right zone and the mobile dropdown
- The Tool nav link points to `/dashboard` in both desktop and mobile nav

- [ ] **Step 5: Stop the dev server (Ctrl+C)**
