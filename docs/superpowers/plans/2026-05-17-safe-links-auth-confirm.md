# Safe Links — Auth Confirm Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an intermediate `/auth/confirm` page so Microsoft Safe Links cannot consume the magic link token before the user clicks it.

**Architecture:** The magic link now points to `/auth/confirm?code=xxx`. This server-component page renders a "Complete sign-in" button with the code as a hidden form field — no token exchange happens on page load. Clicking the button fires a server action that calls `exchangeCodeForSession`, upserts the profile, and redirects to `/dashboard`. The existing `/auth/callback` route is left untouched.

**Tech Stack:** Next.js 14 App Router, Supabase SSR, Tailwind CSS, Vitest + Testing Library

---

## File Map

| File | Action |
|---|---|
| `app/auth/confirm/actions.ts` | Create — server action: exchange code, upsert profile, redirect |
| `app/auth/confirm/page.tsx` | Create — server component: 3 render states (valid code / error / no code) |
| `app/login/page.tsx` | Modify line 19 — change `emailRedirectTo` from `/auth/callback` to `/auth/confirm` |
| `__tests__/app/auth/confirm/page.test.tsx` | Create — render tests for all 3 page states |

---

## Task 1: Create branch

**Files:** none

- [ ] **Step 1: Create and switch to feature branch**

```bash
git checkout master && git pull
git checkout -b feat/safe-links-confirm-page
```

Expected: `Switched to a new branch 'feat/safe-links-confirm-page'`

---

## Task 2: Create the server action

**Files:**
- Create: `app/auth/confirm/actions.ts`

- [ ] **Step 1: Create the file**

```typescript
// app/auth/confirm/actions.ts
'use server'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function confirmLogin(formData: FormData) {
  const code = formData.get('code') as string | null
  if (!code) redirect('/login')

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.exchangeCodeForSession(code)

  if (user) {
    await supabase.from('profiles').upsert(
      {
        id: user.id,
        email: user.email,
        display_name: user.email?.split('@')[0] ?? '',
      },
      { onConflict: 'id' }
    )
  }

  redirect('/dashboard')
}
```

- [ ] **Step 2: Commit**

```bash
git add app/auth/confirm/actions.ts
git commit -m "feat: add confirmLogin server action for Safe Links-proof auth"
```

---

## Task 3: Write tests for the confirm page

**Files:**
- Create: `__tests__/app/auth/confirm/page.test.tsx`

The confirm page has three render states. Tests cover the two that produce visible DOM (valid code, error). The no-code state calls `redirect()` which throws a Next.js internal error — tested by asserting the throw.

- [ ] **Step 1: Create the test file**

```typescript
// __tests__/app/auth/confirm/page.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import AuthConfirmPage from '@/app/auth/confirm/page'

// next/navigation redirect throws a Next.js-internal error in tests
vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`)
  }),
}))

// server action is not exercised in render tests
vi.mock('@/app/auth/confirm/actions', () => ({
  confirmLogin: vi.fn(),
}))

describe('AuthConfirmPage', () => {
  it('renders the complete sign-in button when a code is present', async () => {
    render(await AuthConfirmPage({ searchParams: { code: 'test-code-123' } }))
    expect(screen.getByRole('heading', { name: /complete your sign-in/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeTruthy()
  })

  it('renders the error state when an error param is present', async () => {
    render(
      await AuthConfirmPage({
        searchParams: {
          error: 'access_denied',
          error_description: 'Email link is invalid or has expired',
        },
      })
    )
    expect(screen.getByRole('heading', { name: /link expired/i })).toBeTruthy()
    expect(screen.getByText(/invalid or has expired/i)).toBeTruthy()
    expect(screen.getByRole('link', { name: /back to sign in/i })).toBeTruthy()
  })

  it('redirects to /login when neither code nor error is present', async () => {
    await expect(AuthConfirmPage({ searchParams: {} })).rejects.toThrow(
      'NEXT_REDIRECT:/login'
    )
  })
})
```

- [ ] **Step 2: Run the tests — expect FAIL (page not created yet)**

```bash
npx vitest run __tests__/app/auth/confirm/page.test.tsx
```

Expected output: `FAIL` with "Cannot find module '@/app/auth/confirm/page'"

---

## Task 4: Create the confirm page

**Files:**
- Create: `app/auth/confirm/page.tsx`

- [ ] **Step 1: Create the file**

```typescript
// app/auth/confirm/page.tsx
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { confirmLogin } from './actions'

interface Props {
  searchParams: {
    code?: string
    error?: string
    error_description?: string
  }
}

export default async function AuthConfirmPage({ searchParams }: Props) {
  if (searchParams.error) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="max-w-sm text-center">
          <h1 className="mb-2 text-2xl font-bold">Link expired</h1>
          <p className="mb-6 text-slate-500">
            {searchParams.error_description ??
              'This sign-in link has expired or already been used.'}
          </p>
          <Link
            href="/login"
            className="text-sm font-semibold text-amber-500 hover:text-amber-400"
          >
            ← Back to sign in
          </Link>
        </div>
      </div>
    )
  }

  if (!searchParams.code) {
    redirect('/login')
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <h1 className="mb-2 text-2xl font-bold">Complete your sign-in</h1>
        <p className="mb-6 text-slate-500">Click below to sign in to Brilliant Managers.</p>
        <form action={confirmLogin}>
          <input type="hidden" name="code" value={searchParams.code} />
          <button
            type="submit"
            className="w-full rounded-lg bg-amber-500 px-4 py-3 text-sm font-semibold text-white hover:bg-amber-400"
          >
            Sign in →
          </button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Run the tests — expect PASS**

```bash
npx vitest run __tests__/app/auth/confirm/page.test.tsx
```

Expected output: `PASS (3)`

- [ ] **Step 3: Run the full test suite — expect no regressions**

```bash
npx vitest run
```

Expected: all tests pass

- [ ] **Step 4: Commit**

```bash
git add app/auth/confirm/page.tsx __tests__/app/auth/confirm/page.test.tsx
git commit -m "feat: add /auth/confirm intermediate page to defeat Safe Links token consumption"
```

---

## Task 5: Update login page to point to /auth/confirm

**Files:**
- Modify: `app/login/page.tsx` (one line)

- [ ] **Step 1: Change `emailRedirectTo`**

In `app/login/page.tsx`, find this line (currently line 19):

```typescript
          emailRedirectTo: `${window.location.origin}/auth/callback`,
```

Change it to:

```typescript
          emailRedirectTo: `${window.location.origin}/auth/confirm`,
```

- [ ] **Step 2: Run full test suite**

```bash
npx vitest run
```

Expected: all tests pass

- [ ] **Step 3: Commit**

```bash
git add app/login/page.tsx
git commit -m "fix: point magic link emailRedirectTo /auth/confirm to prevent Safe Links consumption"
```

---

## Task 6: Push and open PR (stop before gh pr create — show diff for approval)

- [ ] **Step 1: Show the diff**

```bash
git diff master...HEAD --stat
git diff master...HEAD
```

- [ ] **Step 2: Wait for explicit user approval before running `gh pr create`**

---

## Post-merge: Supabase Dashboard

After the PR is merged and deployed, do the following in the Supabase dashboard (one-time):

**Authentication → URL Configuration → Redirect URLs**

Add both:
```
https://brilliantmanagers.info/auth/confirm
http://localhost:3000/auth/confirm
```

This whitelists the new redirect destination. Without it, Supabase will reject the `emailRedirectTo` value with a redirect URL mismatch error.
