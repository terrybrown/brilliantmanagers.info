# Bot Prevention Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gate both signup forms behind Cloudflare Turnstile so bots cannot trigger `signInWithOtp` (and therefore cannot burn email quota), then clean up existing unverified bot accounts.

**Architecture:** The Cloudflare Turnstile widget is rendered invisible inside each form. Its `onSuccess` callback provides a single-use token that is passed as `options.captchaToken` to the existing `signInWithOtp` call. Supabase verifies the token against Cloudflare on its servers — no Next.js server action is needed. The submit button is disabled until the token arrives. A separate one-shot script cleans up unverified users created before the fix.

**Tech Stack:** `@marsidev/react-turnstile`, `@supabase/supabase-js` (admin client, already in deps), Vitest + Testing Library

---

## File Map

| Action | File |
|---|---|
| Modify | `app/the-tool/JoinNowForm.tsx` |
| Modify | `app/login/page.tsx` |
| Create | `__tests__/app/the-tool/JoinNowForm.test.tsx` |
| Create | `__tests__/app/login/page.test.tsx` |
| Create | `scripts/cleanup-unverified-users.ts` |

---

## Task 1: Install `@marsidev/react-turnstile`

**Files:**
- Modify: `package.json`, `package-lock.json`

- [ ] **Step 1: Confirm baseline tests pass**

```bash
npm test
```

Expected: all tests pass with no failures. Do not proceed if any tests are failing.

- [ ] **Step 2: Install the package**

```bash
npm install @marsidev/react-turnstile
```

- [ ] **Step 3: Verify it appears in dependencies**

```bash
grep '"@marsidev/react-turnstile"' package.json
```

Expected output (version may differ):
```
"@marsidev/react-turnstile": "^0.x.x",
```

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add @marsidev/react-turnstile for Cloudflare Turnstile bot prevention"
```

---

## Task 2: Add Turnstile to `JoinNowForm`

**Files:**
- Modify: `app/the-tool/JoinNowForm.tsx`
- Create: `__tests__/app/the-tool/JoinNowForm.test.tsx`

- [ ] **Step 1: Create the test file**

Create `__tests__/app/the-tool/JoinNowForm.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

// Mock Turnstile — renders a button that fires onSuccess when clicked
vi.mock('@marsidev/react-turnstile', () => ({
  Turnstile: ({ onSuccess }: { onSuccess: (token: string) => void }) => (
    <button type="button" data-testid="turnstile-mock" onClick={() => onSuccess('test-captcha-token')}>
      verify
    </button>
  ),
}))

// Mock Supabase client — module-level createClient in JoinNowForm
const mockSignInWithOtp = vi.hoisted(() => vi.fn())
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: { signInWithOtp: mockSignInWithOtp },
  }),
}))

// Mock next/link (not needed for logic, but avoids router errors in jsdom)
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

import { JoinNowForm } from '@/app/the-tool/JoinNowForm'

describe('JoinNowForm', () => {
  beforeEach(() => {
    mockSignInWithOtp.mockReset()
  })

  it('disables the submit button before Turnstile fires', () => {
    render(<JoinNowForm />)
    expect(screen.getByRole('button', { name: /join now/i })).toBeDisabled()
  })

  it('enables the submit button after Turnstile fires onSuccess', () => {
    render(<JoinNowForm />)
    fireEvent.click(screen.getByTestId('turnstile-mock'))
    expect(screen.getByRole('button', { name: /join now/i })).not.toBeDisabled()
  })

  it('calls signInWithOtp with email and captchaToken on submit', async () => {
    mockSignInWithOtp.mockResolvedValue({ error: null })
    render(<JoinNowForm />)

    fireEvent.click(screen.getByTestId('turnstile-mock'))
    fireEvent.change(screen.getByPlaceholderText('your@email.com'), {
      target: { value: 'user@example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: /join now/i }))

    await waitFor(() => {
      expect(mockSignInWithOtp).toHaveBeenCalledWith({
        email: 'user@example.com',
        options: expect.objectContaining({ captchaToken: 'test-captcha-token' }),
      })
    })
  })

  it('shows "Check your email" after successful submit', async () => {
    mockSignInWithOtp.mockResolvedValue({ error: null })
    render(<JoinNowForm />)

    fireEvent.click(screen.getByTestId('turnstile-mock'))
    fireEvent.change(screen.getByPlaceholderText('your@email.com'), {
      target: { value: 'user@example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: /join now/i }))

    await waitFor(() => {
      expect(screen.getByText(/check your email/i)).toBeInTheDocument()
    })
  })

  it('shows error message and disables the button again on signInWithOtp error', async () => {
    mockSignInWithOtp.mockResolvedValue({ error: { message: 'Too many requests' } })
    render(<JoinNowForm />)

    fireEvent.click(screen.getByTestId('turnstile-mock'))
    fireEvent.change(screen.getByPlaceholderText('your@email.com'), {
      target: { value: 'user@example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: /join now/i }))

    await waitFor(() => {
      expect(screen.getByText('Too many requests')).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: /join now/i })).toBeDisabled()
  })
})
```

- [ ] **Step 2: Run the tests — verify they fail**

```bash
npm test -- --reporter=verbose JoinNowForm
```

Expected: 5 failures — `JoinNowForm` is not yet importing Turnstile.

- [ ] **Step 3: Update `app/the-tool/JoinNowForm.tsx`**

Replace the entire file with:

```tsx
'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Turnstile } from '@marsidev/react-turnstile'
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

export function JoinNowForm() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!captchaToken) return
    setError('')
    setLoading(true)
    try {
      const { error: err } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          captchaToken,
        },
      })
      if (err) {
        setError(err.message)
        setCaptchaToken(null)
      } else {
        setSent(true)
      }
    } catch {
      setError('Something went wrong. Please try again.')
      setCaptchaToken(null)
    } finally {
      setLoading(false)
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
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <input
        type="email"
        required
        placeholder="your@email.com"
        value={email}
        onChange={e => { setEmail(e.target.value); if (error) setError('') }}
        className="w-full rounded-md px-3.5 py-2.5 text-sm"
        style={{
          background: 'rgba(254,252,247,0.07)',
          border: '1px solid rgba(254,252,247,0.14)',
          color: '#fefcf7',
        }}
      />
      {error && (
        <p className="text-xs" style={{ color: '#f87171' }}>
          {error}
        </p>
      )}
      <Turnstile
        siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
        onSuccess={token => setCaptchaToken(token)}
        options={{ size: 'invisible' }}
      />
      {loading ? (
        <div
          className="flex items-end justify-center gap-1"
          style={{ height: 42 }}
          aria-label="Sending…"
        >
          <span className="loading-dot" />
          <span className="loading-dot" style={{ animationDelay: '0.15s' }} />
          <span className="loading-dot" style={{ animationDelay: '0.3s' }} />
        </div>
      ) : (
        <button
          type="submit"
          disabled={!captchaToken}
          className="w-full rounded-md py-2.5 text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: '#f59e0b', color: '#1a3a5c' }}
        >
          Join now →
        </button>
      )}
      <p
        className="mt-1 text-center text-xs"
        style={{
          paddingTop: 12,
          borderTop: '1px solid rgba(254,252,247,0.08)',
          color: 'rgba(254,252,247,0.35)',
        }}
      >
        Already have an account?{' '}
        <Link
          href="/login"
          style={{ color: 'rgba(254,252,247,0.6)', textDecoration: 'underline' }}
        >
          Sign in
        </Link>
      </p>
    </form>
  )
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npm test -- --reporter=verbose JoinNowForm
```

Expected: 5 tests pass.

- [ ] **Step 5: Run the full suite to check for regressions**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add app/the-tool/JoinNowForm.tsx __tests__/app/the-tool/JoinNowForm.test.tsx
git commit -m "feat: gate JoinNowForm behind Cloudflare Turnstile CAPTCHA"
```

---

## Task 3: Add Turnstile to `app/login/page.tsx`

**Files:**
- Modify: `app/login/page.tsx`
- Create: `__tests__/app/login/page.test.tsx`

- [ ] **Step 1: Create the test file**

Create `__tests__/app/login/page.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

vi.mock('@marsidev/react-turnstile', () => ({
  Turnstile: ({ onSuccess }: { onSuccess: (token: string) => void }) => (
    <button type="button" data-testid="turnstile-mock" onClick={() => onSuccess('test-captcha-token')}>
      verify
    </button>
  ),
}))

const mockSignInWithOtp = vi.hoisted(() => vi.fn())
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: { signInWithOtp: mockSignInWithOtp },
  }),
}))

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

import LoginPage from '@/app/login/page'

describe('LoginPage', () => {
  beforeEach(() => {
    mockSignInWithOtp.mockReset()
  })

  it('disables the submit button before Turnstile fires', () => {
    render(<LoginPage />)
    expect(screen.getByRole('button', { name: /send magic link/i })).toBeDisabled()
  })

  it('enables the submit button after Turnstile fires onSuccess', () => {
    render(<LoginPage />)
    fireEvent.click(screen.getByTestId('turnstile-mock'))
    expect(screen.getByRole('button', { name: /send magic link/i })).not.toBeDisabled()
  })

  it('calls signInWithOtp with email and captchaToken on submit', async () => {
    mockSignInWithOtp.mockResolvedValue({ error: null })
    render(<LoginPage />)

    fireEvent.click(screen.getByTestId('turnstile-mock'))
    fireEvent.change(screen.getByPlaceholderText('your@email.com'), {
      target: { value: 'user@example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: /send magic link/i }))

    await waitFor(() => {
      expect(mockSignInWithOtp).toHaveBeenCalledWith({
        email: 'user@example.com',
        options: expect.objectContaining({ captchaToken: 'test-captcha-token' }),
      })
    })
  })

  it('shows "Check your email" after successful submit', async () => {
    mockSignInWithOtp.mockResolvedValue({ error: null })
    render(<LoginPage />)

    fireEvent.click(screen.getByTestId('turnstile-mock'))
    fireEvent.change(screen.getByPlaceholderText('your@email.com'), {
      target: { value: 'user@example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: /send magic link/i }))

    await waitFor(() => {
      expect(screen.getByText(/check your email/i)).toBeInTheDocument()
    })
  })

  it('shows error message and disables the button again on signInWithOtp error', async () => {
    mockSignInWithOtp.mockResolvedValue({ error: { message: 'Invalid email' } })
    render(<LoginPage />)

    fireEvent.click(screen.getByTestId('turnstile-mock'))
    fireEvent.change(screen.getByPlaceholderText('your@email.com'), {
      target: { value: 'bad@example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: /send magic link/i }))

    await waitFor(() => {
      expect(screen.getByText('Invalid email')).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: /send magic link/i })).toBeDisabled()
  })
})
```

- [ ] **Step 2: Run the tests — verify they fail**

```bash
npm test -- --reporter=verbose "login/page"
```

Expected: 5 failures.

- [ ] **Step 3: Update `app/login/page.tsx`**

Replace the entire file with:

```tsx
'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Turnstile } from '@marsidev/react-turnstile'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!captchaToken) return
    setError('')
    setLoading(true)
    try {
      const supabase = createClient()
      const { error: err } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/confirm`,
          captchaToken,
        },
      })
      if (err) {
        setError(err.message)
        setCaptchaToken(null)
      } else {
        setSent(true)
      }
    } catch {
      setError('Something went wrong. Please try again.')
      setCaptchaToken(null)
    } finally {
      setLoading(false)
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
          <Turnstile
            siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
            onSuccess={token => setCaptchaToken(token)}
            options={{ size: 'invisible' }}
          />
          <button
            type="submit"
            disabled={loading || !captchaToken}
            className="rounded-lg bg-amber-500 px-4 py-3 text-sm font-semibold text-white hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed"
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

- [ ] **Step 4: Run tests — verify they pass**

```bash
npm test -- --reporter=verbose "login/page"
```

Expected: 5 tests pass.

- [ ] **Step 5: Run the full suite to check for regressions**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add app/login/page.tsx __tests__/app/login/page.test.tsx
git commit -m "feat: gate login page behind Cloudflare Turnstile CAPTCHA"
```

---

## Task 4: Cleanup script

**Files:**
- Create: `scripts/cleanup-unverified-users.ts`

This script has no unit tests — it directly calls the Supabase admin API with live credentials. Verify manually using the dry-run flag described below.

- [ ] **Step 1: Create `scripts/cleanup-unverified-users.ts`**

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const DRY_RUN = process.argv.includes('--dry-run')
const CUTOFF_DAYS = 7
const cutoffDate = new Date(Date.now() - CUTOFF_DAYS * 24 * 60 * 60 * 1000)

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function main() {
  console.log(`Cutoff: ${cutoffDate.toISOString()} (unverified users older than ${CUTOFF_DAYS} days)`)
  if (DRY_RUN) console.log('DRY RUN — no deletions will be performed\n')

  let page = 1
  const perPage = 1000
  let totalScanned = 0
  let totalFound = 0
  let totalDeleted = 0
  const errors: string[] = []

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage })
    if (error) {
      console.error('Failed to list users:', error.message)
      process.exit(1)
    }

    totalScanned += data.users.length

    const toDelete = data.users.filter(
      u => !u.email_confirmed_at && new Date(u.created_at) < cutoffDate,
    )

    totalFound += toDelete.length

    for (const user of toDelete) {
      if (DRY_RUN) {
        console.log(`[dry-run] Would delete: ${user.email} (created ${user.created_at})`)
        totalDeleted++
        continue
      }
      const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id)
      if (deleteError) {
        errors.push(`${user.email}: ${deleteError.message}`)
      } else {
        console.log(`Deleted: ${user.email} (created ${user.created_at})`)
        totalDeleted++
      }
    }

    if (data.users.length < perPage) break
    page++
  }

  console.log(`\nScanned: ${totalScanned} | Found: ${totalFound} | Deleted: ${totalDeleted} | Errors: ${errors.length}`)
  if (errors.length > 0) {
    console.log('Errors:')
    errors.forEach(e => console.log(` - ${e}`))
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
```

- [ ] **Step 2: Run a dry run to verify it finds the expected accounts**

```bash
NEXT_PUBLIC_SUPABASE_URL=<your-url> SUPABASE_SERVICE_ROLE_KEY=<your-key> npx tsx scripts/cleanup-unverified-users.ts --dry-run
```

Expected output: a list of `[dry-run] Would delete:` lines for each unverified account older than 7 days, followed by a summary. The emails should match the bot accounts visible in the Supabase dashboard (the ones with `tmomail.net`, dotted Gmail addresses, etc.). No real users (i.e. no `terry@hairylemon.net` or other confirmed accounts) should appear.

If you see legitimate-looking unverified accounts (e.g. someone you recognise), they simply haven't clicked their magic link yet but are within 7 days — the date filter already protects them.

- [ ] **Step 3: Run the real cleanup**

Only proceed after the dry run output looks correct:

```bash
NEXT_PUBLIC_SUPABASE_URL=<your-url> SUPABASE_SERVICE_ROLE_KEY=<your-key> npx tsx scripts/cleanup-unverified-users.ts
```

Expected: each deleted account is printed, summary shows 0 errors.

- [ ] **Step 4: Commit the script**

```bash
git add scripts/cleanup-unverified-users.ts
git commit -m "chore: add one-time script to delete unverified bot accounts"
```

---

## Self-Review Notes

- Spec coverage: prevention (both forms) ✓, cleanup (script) ✓, env var setup ✓
- No placeholders
- `captchaToken` type and state shape consistent across tasks 2 and 3
- `options.captchaToken` matches Supabase SDK's `SignInWithPasswordlessCredentials` type
- Dry-run flag guards against accidental mass deletion
- `@supabase/supabase-js` is already in `dependencies` (confirmed in package.json) — no install needed for the script
