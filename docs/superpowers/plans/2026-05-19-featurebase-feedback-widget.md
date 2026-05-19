# Featurebase Feedback Widget Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Embed Featurebase's native feedback widget into all authenticated app pages, with users silently identified via a server-signed JWT.

**Architecture:** `app/(app)/layout.tsx` (server) generates a HS256-signed JWT from the Supabase user and passes it to `AppShell`. `AppShell` wraps its render tree with `FeaturebaseProvider` and mounts a `FeedbackWidget` component that activates the native Featurebase floating button via `useFeedbackWidget`.

**Tech Stack:** `featurebase-js` (React widget SDK), `jsonwebtoken` (HS256 JWT signing), Vitest + Testing Library (tests)

---

## File map

| Action | Path | Responsibility |
|---|---|---|
| Create | `lib/featurebase.ts` | Signs the Featurebase JWT server-side |
| Create | `components/app/FeedbackWidget.tsx` | Client component; activates the native Featurebase floating button |
| Create | `__tests__/lib/featurebase.test.ts` | Unit tests for JWT generation |
| Create | `__tests__/components/app/FeedbackWidget.test.tsx` | Render test for FeedbackWidget |
| Modify | `app/(app)/layout.tsx` | Generate JWT and pass to AppShell |
| Modify | `components/app/AppShell.tsx` | Accept JWT prop, wrap with FeaturebaseProvider, mount FeedbackWidget |
| Modify | `CLAUDE.md` | Document new env vars in the env vars table |

---

## Task 1: Install dependencies and configure environment

**Files:**
- Modify: `package.json` (via npm install)
- Modify: `.env.local`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Install runtime and dev packages**

```bash
npm install featurebase-js jsonwebtoken
npm install --save-dev @types/jsonwebtoken
```

Expected: packages added to `dependencies` and `devDependencies` in `package.json`, `package-lock.json` updated.

- [ ] **Step 2: Add env vars to `.env.local`**

Open `.env.local` and append these two lines (fill in values from Featurebase dashboard):

```
NEXT_PUBLIC_FEATUREBASE_APP_ID=your_app_id_here
FEATUREBASE_JWT_SECRET=your_jwt_secret_here
```

Where to find them:
- `NEXT_PUBLIC_FEATUREBASE_APP_ID` → Featurebase → Settings → Developers → Installation
- `FEATUREBASE_JWT_SECRET` → Featurebase → Settings → Access & Security → Security

- [ ] **Step 3: Document the new env vars in CLAUDE.md**

In `CLAUDE.md`, find the environment variables table (under `### Environment variables`) and add two rows:

```markdown
| `NEXT_PUBLIC_FEATUREBASE_APP_ID` | Client + server |
| `FEATUREBASE_JWT_SECRET` | Server only (JWT signing for Featurebase widget identity) |
```

The table currently ends with `MAILGUN_SENDING_KEY`. Add these two rows after it.

- [ ] **Step 4: Verify the dev server still starts**

```bash
npm run dev
```

Expected: server starts at http://localhost:3000 with no errors.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json CLAUDE.md
git commit -m "chore: install featurebase-js + jsonwebtoken, document env vars"
```

---

## Task 2: JWT generation — `lib/featurebase.ts`

**Files:**
- Create: `lib/featurebase.ts`
- Create: `__tests__/lib/featurebase.test.ts`

- [ ] **Step 1: Write the failing test**

Create `__tests__/lib/featurebase.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import jwt from 'jsonwebtoken'

const TEST_SECRET = 'test-secret-at-least-32-chars-long!!'

beforeEach(() => {
  process.env.FEATUREBASE_JWT_SECRET = TEST_SECRET
})

afterEach(() => {
  delete process.env.FEATUREBASE_JWT_SECRET
})

describe('generateFeaturebaseJwt', () => {
  it('returns a JWT containing userId, email, and name', async () => {
    const { generateFeaturebaseJwt } = await import('@/lib/featurebase')
    const token = generateFeaturebaseJwt({
      id: 'user-123',
      email: 'test@example.com',
      displayName: 'Test User',
    })
    const payload = jwt.decode(token) as Record<string, unknown>
    expect(payload.userId).toBe('user-123')
    expect(payload.email).toBe('test@example.com')
    expect(payload.name).toBe('Test User')
  })

  it('signs with HS256 and the JWT secret', async () => {
    const { generateFeaturebaseJwt } = await import('@/lib/featurebase')
    const token = generateFeaturebaseJwt({
      id: 'user-456',
      email: 'other@example.com',
      displayName: 'Other User',
    })
    // verify() throws if the algorithm or secret is wrong
    expect(() => jwt.verify(token, TEST_SECRET, { algorithms: ['HS256'] })).not.toThrow()
  })

  it('throws when FEATUREBASE_JWT_SECRET is not set', async () => {
    delete process.env.FEATUREBASE_JWT_SECRET
    // Re-import to get fresh module (dynamic import bypasses module cache in this test)
    const { generateFeaturebaseJwt } = await import('@/lib/featurebase')
    expect(() =>
      generateFeaturebaseJwt({ id: 'x', email: 'x@x.com', displayName: 'X' })
    ).toThrow('FEATUREBASE_JWT_SECRET is not set')
  })
})
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
npm test -- featurebase
```

Expected: 3 tests FAIL with "Cannot find module '@/lib/featurebase'"

- [ ] **Step 3: Create `lib/featurebase.ts`**

```ts
import jwt from 'jsonwebtoken'

export function generateFeaturebaseJwt(user: {
  id: string
  email: string
  displayName: string
}): string {
  const secret = process.env.FEATUREBASE_JWT_SECRET
  if (!secret) throw new Error('FEATUREBASE_JWT_SECRET is not set')

  return jwt.sign(
    { userId: user.id, email: user.email, name: user.displayName },
    secret,
    { algorithm: 'HS256' }
  )
}
```

- [ ] **Step 4: Run the tests and confirm they pass**

```bash
npm test -- featurebase
```

Expected: 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/featurebase.ts __tests__/lib/featurebase.test.ts
git commit -m "feat: add generateFeaturebaseJwt server utility"
```

---

## Task 3: FeedbackWidget component

**Files:**
- Create: `components/app/FeedbackWidget.tsx`
- Create: `__tests__/components/app/FeedbackWidget.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `__tests__/components/app/FeedbackWidget.test.tsx`:

```tsx
import { describe, it, vi, expect } from 'vitest'
import { render } from '@testing-library/react'
import { useFeedbackWidget } from 'featurebase-js/react'
import { FeedbackWidget } from '@/components/app/FeedbackWidget'

vi.mock('featurebase-js/react', () => ({
  useFeedbackWidget: vi.fn(),
  FeaturebaseProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

describe('FeedbackWidget', () => {
  it('renders without error', () => {
    render(<FeedbackWidget />)
    // No assertion needed — the test fails if the component throws
  })

  it('calls useFeedbackWidget with dark theme and right placement', () => {
    render(<FeedbackWidget />)
    expect(useFeedbackWidget).toHaveBeenCalledWith(
      expect.objectContaining({ theme: 'dark', placement: 'right' })
    )
  })
})
```

Note: `vi.mock` is hoisted above imports by Vitest, so `useFeedbackWidget` imported at the top is already the mocked version when the test runs.

- [ ] **Step 2: Run to confirm it fails**

```bash
npm test -- FeedbackWidget
```

Expected: FAIL with "Cannot find module '@/components/app/FeedbackWidget'"

- [ ] **Step 3: Create `components/app/FeedbackWidget.tsx`**

```tsx
'use client'
import { useFeedbackWidget } from 'featurebase-js/react'

export function FeedbackWidget() {
  useFeedbackWidget({
    theme: 'dark',
    placement: 'right',
    locale: 'en',
  })
  return null
}
```

The hook activates the Featurebase native floating button — no DOM output needed from this component.

- [ ] **Step 4: Run the tests and confirm they pass**

```bash
npm test -- FeedbackWidget
```

Expected: 2 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add components/app/FeedbackWidget.tsx __tests__/components/app/FeedbackWidget.test.tsx
git commit -m "feat: add FeedbackWidget component"
```

---

## Task 4: Wire up layout and AppShell

**Files:**
- Modify: `app/(app)/layout.tsx`
- Modify: `components/app/AppShell.tsx`

- [ ] **Step 1: Update `app/(app)/layout.tsx`**

Replace the entire file with:

```tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getSignedAvatarUrl } from '@/lib/db/profiles'
import { isSuperAdmin } from '@/lib/auth/roles'
import { generateFeaturebaseJwt } from '@/lib/featurebase'
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

  const [{ data: profile }, superAdmin] = await Promise.all([
    supabase.from('profiles').select('display_name, avatar_path').eq('id', user.id).maybeSingle(),
    isSuperAdmin(user.id),
  ])

  const displayName = profile?.display_name ?? user.email?.split('@')[0] ?? 'You'
  const email = user.email ?? ''
  const initials = getInitials(displayName, email)
  const avatarUrl = profile?.avatar_path
    ? await getSignedAvatarUrl(profile.avatar_path)
    : undefined

  const featurebaseJwt = generateFeaturebaseJwt({ id: user.id, email, displayName })

  return (
    <AppShell
      user={{ displayName, email, initials, avatarUrl: avatarUrl ?? undefined }}
      showBeta={true}
      isSuperAdmin={superAdmin}
      featurebaseJwt={featurebaseJwt}
    >
      {children}
    </AppShell>
  )
}
```

- [ ] **Step 2: Update `components/app/AppShell.tsx`**

Replace the entire file with:

```tsx
'use client'
import { useEffect, useState } from 'react'
import { FeaturebaseProvider } from 'featurebase-js/react'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { FeedbackWidget } from './FeedbackWidget'

const LS_KEY = 'bm_sidebar_expanded'

interface UserInfo {
  displayName: string
  email: string
  initials: string
  avatarUrl?: string
}

export function AppShell({
  user,
  showBeta,
  isSuperAdmin = false,
  featurebaseJwt,
  children,
}: {
  user: UserInfo
  showBeta: boolean
  isSuperAdmin?: boolean
  featurebaseJwt: string
  children: React.ReactNode
}) {
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    try {
      setIsExpanded(localStorage.getItem(LS_KEY) === 'true')
    } catch {
      // localStorage unavailable — keep default false
    }
  }, [])

  function handleToggle() {
    setIsExpanded(prev => {
      const next = !prev
      try {
        localStorage.setItem(LS_KEY, String(next))
      } catch { /* ignore */ }
      return next
    })
  }

  return (
    <FeaturebaseProvider
      appId={process.env.NEXT_PUBLIC_FEATUREBASE_APP_ID!}
      featurebaseJwt={featurebaseJwt}
    >
      <div
        style={{
          display: 'flex',
          height: '100vh',
          overflow: 'hidden',
          background: '#0a0f1e',
        }}
      >
        <Sidebar isExpanded={isExpanded} onToggle={handleToggle} isSuperAdmin={isSuperAdmin} />

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <Topbar user={user} showBeta={showBeta} />
          <main style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
            {children}
          </main>
        </div>

        <FeedbackWidget />
      </div>
    </FeaturebaseProvider>
  )
}
```

- [ ] **Step 3: Run the full test suite**

```bash
npm test
```

Expected: all tests pass. If any test file renders `AppShell` directly (check `__tests__/` with `grep -r AppShell __tests__/`), add the `featurebaseJwt` prop and a mock for `featurebase-js/react` to those test files.

- [ ] **Step 4: Verify in the browser**

```bash
npm run dev
```

Open http://localhost:3000 and sign in. You should see the Featurebase floating button in the bottom-right corner of every app page (`/dashboard`, `/growth`, etc.). Click it to confirm the panel opens with your identity pre-filled.

- [ ] **Step 5: Commit**

```bash
git add app/\(app\)/layout.tsx components/app/AppShell.tsx
git commit -m "feat: wire Featurebase widget into AppShell with JWT identity"
```

---

## Task 5: Run full suite, build check, and raise PR

- [ ] **Step 1: Run the full test suite**

```bash
npm test
```

Expected: all tests pass with no failures.

- [ ] **Step 2: Run a production build**

```bash
npm run build
```

Expected: build completes with no TypeScript errors. If you see a type error on `FeaturebaseProvider` props, check the `featurebase-js` types — the prop names are `appId` and `featurebaseJwt`.

- [ ] **Step 3: Confirm `.env.local` is not staged**

```bash
git status
```

`.env.local` must not appear in the output. If it does, add it to `.gitignore` before proceeding.

- [ ] **Step 4: Raise PR**

Follow the repo's PR workflow. The diff should contain:
- `lib/featurebase.ts` (new)
- `components/app/FeedbackWidget.tsx` (new)
- `__tests__/lib/featurebase.test.ts` (new)
- `__tests__/components/app/FeedbackWidget.test.tsx` (new)
- `app/(app)/layout.tsx` (modified — adds JWT generation + new prop)
- `components/app/AppShell.tsx` (modified — adds FeaturebaseProvider wrap + FeedbackWidget)
- `CLAUDE.md` (modified — new env vars documented)
- `package.json` + `package-lock.json` (modified — new deps)
