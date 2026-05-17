# Open Beta & CTA Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Open the beta to all authenticated users, replace the tool page CTA with a compelling inline sign-up form, add a "Sign in" button to the public nav, and link the login page back to the sign-up section.

**Architecture:** Four independent file changes plus one new client component (`BetaSignupForm`). The new form reuses the same `supabase.auth.signInWithOtp` pattern already in `app/login/page.tsx`. No new routes, no schema changes, no new dependencies.

**Tech Stack:** Next.js 14 (App Router), Supabase JS client, React, Vitest + React Testing Library

---

## File Map

| Action | Path | What changes |
|--------|------|-------------|
| Modify | `app/(app)/layout.tsx` | Remove `APP_BETA_EMAILS` guard; hardcode `showBeta={true}` |
| Modify | `.env.local` | Remove `APP_BETA_EMAILS` line |
| **Create** | `components/tool/BetaSignupForm.tsx` | New client component — email form + success/error states |
| **Create** | `__tests__/components/tool/BetaSignupForm.test.tsx` | Tests for the form component |
| Modify | `app/the-tool/page.tsx` | Replace bottom CTA box with new design using `BetaSignupForm` |
| Modify | `components/layout/nav.tsx` | Add amber "Sign in" button |
| **Create** | `__tests__/components/layout/Nav.test.tsx` | Test that Sign in link renders |
| Modify | `app/login/page.tsx` | Add "New here?" link to sign-up section |
| **Create** | `__tests__/components/login/LoginPage.test.tsx` | Test that sign-up link renders |

---

## Task 1: Remove the beta allow-list

**Files:**
- Modify: `app/(app)/layout.tsx`
- Modify: `.env.local`

- [ ] **Step 1: Open `app/(app)/layout.tsx` and remove the allow-list block**

Replace lines 20–24 and the `showBeta` prop — the full file should become:

```tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/app/AppShell'

function getInitials(displayName: string | null, email: string | null): string {
  const name = displayName ?? email ?? '?'
  const parts = name.split(/[\s@]/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .maybeSingle()

  const displayName = profile?.display_name ?? user.email?.split('@')[0] ?? 'You'
  const email = user.email ?? ''
  const initials = getInitials(displayName, email)

  return (
    <AppShell
      user={{ displayName, email, initials }}
      showBeta={true}
    >
      {children}
    </AppShell>
  )
}
```

- [ ] **Step 2: Remove `APP_BETA_EMAILS` from `.env.local`**

Delete the line:
```
APP_BETA_EMAILS=terry.brown@mews.com
```

- [ ] **Step 3: Run the test suite to confirm nothing broke**

```bash
npm test
```

Expected: all tests pass (this change has no testable unit — the guard is gone, any logged-in user now reaches the app).

- [ ] **Step 4: Commit**

```bash
git add app/(app)/layout.tsx .env.local
git commit -m "feat: open beta to all authenticated users, remove email allow-list"
```

---

## Task 2: Create the BetaSignupForm component (TDD)

**Files:**
- Create: `__tests__/components/tool/BetaSignupForm.test.tsx`
- Create: `components/tool/BetaSignupForm.tsx`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/components/tool/BetaSignupForm.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BetaSignupForm } from '@/components/tool/BetaSignupForm'

const mockSignInWithOtp = vi.fn()

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: { signInWithOtp: mockSignInWithOtp },
  }),
}))

beforeEach(() => {
  mockSignInWithOtp.mockReset()
})

describe('BetaSignupForm', () => {
  it('renders email input and submit button', () => {
    render(<BetaSignupForm />)
    expect(screen.getByPlaceholderText('your@email.com')).toBeTruthy()
    expect(screen.getByRole('button', { name: /get early access/i })).toBeTruthy()
  })

  it('calls signInWithOtp with the entered email on submit', async () => {
    mockSignInWithOtp.mockResolvedValue({ error: null })
    render(<BetaSignupForm />)
    fireEvent.change(screen.getByPlaceholderText('your@email.com'), {
      target: { value: 'test@example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: /get early access/i }))
    await waitFor(() => {
      expect(mockSignInWithOtp).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'test@example.com' })
      )
    })
  })

  it('shows success state after successful submission', async () => {
    mockSignInWithOtp.mockResolvedValue({ error: null })
    render(<BetaSignupForm />)
    fireEvent.change(screen.getByPlaceholderText('your@email.com'), {
      target: { value: 'test@example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: /get early access/i }))
    await waitFor(() => {
      expect(screen.getByText(/check your email/i)).toBeTruthy()
      expect(screen.getByText('test@example.com')).toBeTruthy()
    })
  })

  it('hides the form after successful submission', async () => {
    mockSignInWithOtp.mockResolvedValue({ error: null })
    render(<BetaSignupForm />)
    fireEvent.change(screen.getByPlaceholderText('your@email.com'), {
      target: { value: 'test@example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: /get early access/i }))
    await waitFor(() => {
      expect(screen.queryByPlaceholderText('your@email.com')).toBeNull()
    })
  })

  it('shows error message on failure', async () => {
    mockSignInWithOtp.mockResolvedValue({ error: { message: 'Rate limit exceeded' } })
    render(<BetaSignupForm />)
    fireEvent.change(screen.getByPlaceholderText('your@email.com'), {
      target: { value: 'test@example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: /get early access/i }))
    await waitFor(() => {
      expect(screen.getByText('Rate limit exceeded')).toBeTruthy()
    })
  })

  it('keeps the form visible after an error', async () => {
    mockSignInWithOtp.mockResolvedValue({ error: { message: 'Rate limit exceeded' } })
    render(<BetaSignupForm />)
    fireEvent.change(screen.getByPlaceholderText('your@email.com'), {
      target: { value: 'test@example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: /get early access/i }))
    await waitFor(() => {
      expect(screen.getByPlaceholderText('your@email.com')).toBeTruthy()
    })
  })
})
```

- [ ] **Step 2: Run the tests to confirm they fail**

```bash
npm test -- BetaSignupForm
```

Expected: FAIL — `Cannot find module '@/components/tool/BetaSignupForm'`

- [ ] **Step 3: Implement the component**

Create `components/tool/BetaSignupForm.tsx`:

```tsx
'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function BetaSignupForm() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const supabase = createClient()
    const { error: err } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (err) {
      setError(err.message)
    } else {
      setSent(true)
    }
  }

  if (sent) {
    return (
      <div>
        <p style={{ color: '#fefcf7', fontWeight: 600, marginBottom: 4 }}>
          Check your email
        </p>
        <p style={{ color: 'rgba(254,252,247,0.55)', fontSize: '0.875rem' }}>
          We sent a magic link to <strong>{email}</strong>. Click it to get started.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit}>
      <div
        style={{
          display: 'flex',
          gap: 10,
          justifyContent: 'center',
          maxWidth: 400,
          margin: '0 auto',
        }}
      >
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="your@email.com"
          required
          style={{
            flex: 1,
            background: 'rgba(254,252,247,0.08)',
            border: '1px solid rgba(254,252,247,0.20)',
            borderRadius: 8,
            padding: '12px 16px',
            color: '#fefcf7',
            fontSize: '0.875rem',
            outline: 'none',
          }}
        />
        <button
          type="submit"
          style={{
            background: '#f59e0b',
            color: '#1a3a5c',
            fontWeight: 700,
            fontSize: '0.875rem',
            padding: '12px 22px',
            borderRadius: 8,
            border: 'none',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          Get early access →
        </button>
      </div>
      {error && (
        <p style={{ color: '#f87171', fontSize: '0.8rem', marginTop: 8, textAlign: 'center' }}>
          {error}
        </p>
      )}
    </form>
  )
}
```

- [ ] **Step 4: Run the tests to confirm they pass**

```bash
npm test -- BetaSignupForm
```

Expected: all 6 tests PASS

- [ ] **Step 5: Commit**

```bash
git add components/tool/BetaSignupForm.tsx __tests__/components/tool/BetaSignupForm.test.tsx
git commit -m "feat: add BetaSignupForm client component with OTP submit and inline success/error states"
```

---

## Task 3: Update the tool page CTA section

**Files:**
- Modify: `app/the-tool/page.tsx`

No separate test needed — `BetaSignupForm` is already tested; the page itself is a server component with no interactive logic.

- [ ] **Step 1: Replace the bottom CTA section in `app/the-tool/page.tsx`**

The file imports `Link`, `ExternalLink`, `Check` from their current locations. Add an import for `BetaSignupForm` and remove the `Check` import (no longer used). Replace the entire `{/* v2 coming section */}` block.

Full updated file:

```tsx
import Link from 'next/link'
import { ExternalLink } from 'lucide-react'
import { ScorecardPreview } from '@/components/tool/scorecard-preview'
import { BetaSignupForm } from '@/components/tool/BetaSignupForm'

export const metadata = { title: 'The Tool' }

const GOOGLE_SHEET_URL =
  'https://docs.google.com/spreadsheets/d/1CDalSItIni0PWWcrwXzMG-CAOWzjP-1FYPdRCbswcoo/edit?usp=sharing'

export default function ToolPage() {
  return (
    <div className="dark" style={{ background: '#1a3a5c', minHeight: '100vh' }}>
      <div
        className="mx-auto px-6 pb-20 pt-20"
        style={{ maxWidth: 'var(--container-width)' }}
      >
        <div className="grid gap-12 md:grid-cols-2 md:items-center">
          {/* Copy */}
          <div>
            <p
              className="mb-3 text-xs font-semibold uppercase"
              style={{ color: 'rgba(254,252,247,0.38)', letterSpacing: '0.2em' }}
            >
              The Manager Scorecard
            </p>
            <span className="amber-rule" />
            <h1
              className="mb-4 leading-tight"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(2rem, 5vw, 2.75rem)',
                fontWeight: 600,
                letterSpacing: '-0.02em',
                color: '#fefcf7',
              }}
            >
              Score yourself.{' '}
              <em style={{ color: '#f59e0b' }}>Know where to grow.</em>
            </h1>
            <p
              className="mb-8 text-base leading-relaxed"
              style={{ color: 'rgba(254,252,247,0.58)', maxWidth: '420px' }}
            >
              Most managers are flying blind on their own development. This scorecard
              makes the invisible visible — and gives you and your manager a shared
              language for what to work on next.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href={GOOGLE_SHEET_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-md px-5 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90"
                style={{ background: '#fefcf7', color: '#1a3a5c' }}
              >
                Try it now
                <ExternalLink size={14} strokeWidth={2} />
              </Link>
              <span
                className="inline-flex items-center rounded-md border px-5 py-2.5 text-sm font-medium"
                style={{ borderColor: 'rgba(254,252,247,0.14)', color: 'rgba(254,252,247,0.40)', background: 'rgba(254,252,247,0.04)' }}
              >
                Uses Google Sheets — v2 coming soon
              </span>
            </div>
          </div>

          {/* Preview card */}
          <ScorecardPreview />
        </div>

        {/* Beta sign-up section */}
        <div
          id="beta-signup"
          className="mt-16 rounded-xl px-8 py-11 text-center"
          style={{
            background: 'rgba(254,252,247,0.04)',
            border: '1px solid rgba(245,158,11,0.30)',
            borderTop: '3px solid #f59e0b',
          }}
        >
          <span
            className="mb-5 inline-block rounded-full border px-3.5 py-1 text-xs font-bold uppercase tracking-widest"
            style={{
              borderColor: 'rgba(245,158,11,0.35)',
              color: '#fbbf24',
              background: 'rgba(245,158,11,0.12)',
              letterSpacing: '0.14em',
            }}
          >
            Beta — Free to join
          </span>
          <h2
            className="mb-3 text-3xl font-extrabold leading-tight"
            style={{ color: '#fefcf7', letterSpacing: '-0.025em' }}
          >
            Stop flying blind on your own development.
          </h2>
          <p
            className="mx-auto mb-8 text-base leading-relaxed"
            style={{ color: 'rgba(254,252,247,0.58)', maxWidth: '520px' }}
          >
            Most managers wait until their performance review to find out where they
            stand. Brilliant Managers changes that — score yourself across six pillars,
            get clear insights into where you&apos;re strong and where to improve, and
            leave every session with practical steps you can act on straight away.
          </p>
          <BetaSignupForm />
          <p className="mt-3 text-xs" style={{ color: 'rgba(254,252,247,0.25)' }}>
            No password. Click the link in your email and you&apos;re in.
          </p>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Run the test suite**

```bash
npm test
```

Expected: all tests pass

- [ ] **Step 3: Commit**

```bash
git add app/the-tool/page.tsx
git commit -m "feat: replace tool page CTA with beta sign-up section and inline form"
```

---

## Task 4: Add "Sign in" button to the public nav

**Files:**
- Create: `__tests__/components/layout/Nav.test.tsx`
- Modify: `components/layout/nav.tsx`

- [ ] **Step 1: Write the failing test**

Create `__tests__/components/layout/Nav.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Nav } from '@/components/layout/nav'

vi.mock('next/navigation', () => ({ usePathname: () => '/blog' }))
vi.mock('@/components/layout/theme-toggle', () => ({
  ThemeToggle: () => <button>Theme</button>,
}))
vi.mock('@/config/site', () => ({
  siteConfig: {
    nav: [{ href: '/the-guide', label: 'The Guide' }],
    githubUrl: 'https://github.com/test',
    gaId: 'G-TEST',
  },
}))

describe('Nav', () => {
  it('renders a Sign in link pointing to /login', () => {
    render(<Nav />)
    const link = screen.getByRole('link', { name: /sign in/i })
    expect(link).toBeTruthy()
    expect(link.getAttribute('href')).toBe('/login')
  })
})
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
npm test -- Nav.test
```

Expected: FAIL — `Unable to find an accessible element with the role "link" and name /sign in/i`

- [ ] **Step 3: Add the Sign in button to `components/layout/nav.tsx`**

In the right-side `<div className="flex items-center gap-3">`, add the Sign in link **before** the GitHub link:

```tsx
<div className="flex items-center gap-3">
  {showToggle && <ThemeToggle />}
  <Link
    href="/login"
    className="hidden rounded-md border px-3 py-1.5 text-sm font-semibold md:block"
    style={{ borderColor: 'rgba(245,158,11,0.5)', color: '#f59e0b' }}
  >
    Sign in
  </Link>
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
```

- [ ] **Step 4: Run the test to confirm it passes**

```bash
npm test -- Nav.test
```

Expected: PASS

- [ ] **Step 5: Run the full test suite**

```bash
npm test
```

Expected: all tests pass

- [ ] **Step 6: Commit**

```bash
git add components/layout/nav.tsx __tests__/components/layout/Nav.test.tsx
git commit -m "feat: add Sign in button to public nav linking to /login"
```

---

## Task 5: Add "New here?" link to the login page

**Files:**
- Create: `__tests__/components/login/LoginPage.test.tsx`
- Modify: `app/login/page.tsx`

- [ ] **Step 1: Write the failing test**

Create `__tests__/components/login/LoginPage.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import LoginPage from '@/app/login/page'

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: { signInWithOtp: vi.fn().mockResolvedValue({ error: null }) },
  }),
}))

describe('LoginPage', () => {
  it('renders a link to /the-tool#beta-signup for new users', () => {
    render(<LoginPage />)
    const link = screen.getByRole('link', { name: /sign up for the beta/i })
    expect(link).toBeTruthy()
    expect(link.getAttribute('href')).toBe('/the-tool#beta-signup')
  })

  it('the sign-up link is visible in the initial form state', () => {
    render(<LoginPage />)
    expect(screen.getByRole('link', { name: /sign up for the beta/i })).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
npm test -- LoginPage.test
```

Expected: FAIL — `Unable to find an accessible element with the role "link" and name /sign up for the beta/i`

- [ ] **Step 3: Add the link to `app/login/page.tsx`**

In the non-sent state, add the link after the closing `</form>` tag and before the closing `</div>` of the form wrapper. Full updated file:

```tsx
'use client'
import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const supabase = createClient()
    const { error: err } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (err) {
      setError(err.message)
    } else {
      setSent(true)
    }
  }

  if (sent) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="max-w-sm text-center">
          <h1 className="mb-2 text-2xl font-bold">Check your email</h1>
          <p className="text-slate-500">
            We sent a magic link to <strong>{email}</strong>. Click it to sign in.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-6 text-2xl font-bold">Sign in</h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="your@email.com"
            required
            className="rounded-lg border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            type="submit"
            className="rounded-lg bg-amber-500 px-4 py-3 text-sm font-semibold text-white hover:bg-amber-400"
          >
            Send magic link
          </button>
        </form>
        <p className="mt-5 text-center text-sm text-slate-400">
          New here?{' '}
          <Link
            href="/the-tool#beta-signup"
            className="font-medium underline"
            style={{ color: '#f59e0b' }}
          >
            Sign up for the beta →
          </Link>
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run the tests to confirm they pass**

```bash
npm test -- LoginPage.test
```

Expected: both tests PASS

- [ ] **Step 5: Run the full test suite**

```bash
npm test
```

Expected: all tests pass

- [ ] **Step 6: Commit**

```bash
git add app/login/page.tsx __tests__/components/login/LoginPage.test.tsx
git commit -m "feat: add sign-up link to login page pointing to tool page beta section"
```

---

## Task 6: Smoke test

No code changes. Verify the full flow works end-to-end in the browser.

- [ ] **Step 1: Start the dev server**

```bash
npm run develop
```

- [ ] **Step 2: Verify the public nav**

Open `http://localhost:8000`. Confirm an amber "Sign in" button appears on the right side of the nav.

- [ ] **Step 3: Verify the tool page CTA**

Navigate to `http://localhost:8000/the-tool`. Confirm:
- The new CTA section appears at the bottom with the amber top border
- "Stop flying blind on your own development." headline is visible
- Email input and "Get early access →" button are present
- Submitting a real email shows the "Check your email" inline state (no page change)

- [ ] **Step 4: Verify the Sign in → tool page flow**

Click "Sign in" in the nav → `/login`. Confirm "New here? Sign up for the beta →" link is visible. Click it — confirm it navigates to `/the-tool` and scrolls to the CTA section.

- [ ] **Step 5: Verify the beta is open**

Sign in with any email address not previously whitelisted. Confirm you reach the app dashboard instead of being redirected to `/the-tool`.
