# Observability: Analytics Events + Error Monitoring — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add nine typed GA4 custom events across the app and wire up Sentry for full server + client error monitoring.

**Architecture:** A single `lib/analytics.ts` module of SSR-safe functions wraps `window.gtag`. Sentry is configured via three init files and `withSentryConfig` in `next.config.ts`; error boundaries at global and app-shell level capture and report exceptions. Analytics calls are added at the point of each user action in existing client components.

**Tech Stack:** `@sentry/nextjs`, Google Analytics (already initialised as `G-1BSMVXG0PJ` in `app/layout.tsx`), Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-05-21-observability-analytics-errors-design.md`

---

## File Map

**Create:**
- `lib/analytics.ts` — nine typed analytics functions
- `sentry.client.config.ts` — Sentry browser init
- `sentry.server.config.ts` — Sentry Node.js init
- `instrumentation.ts` — Next.js instrumentation hook (registers server Sentry on startup)
- `app/global-error.tsx` — Next.js global error boundary
- `app/(app)/error.tsx` — App-shell error boundary
- `components/reflections/ReflectionViewTracker.tsx` — client component that fires `trackReflectionViewed` on mount
- `__tests__/app/global-error.test.tsx`
- `__tests__/app/app-error.test.tsx`
- `__tests__/components/reflections/ReflectionViewTracker.test.tsx`
- `__tests__/components/app/scorecard/SkillList.test.tsx`
- `__tests__/components/app/GoalForm.test.tsx`
- `__tests__/components/app/EvidenceLog.test.tsx`
- `__tests__/components/people/AddConnectionForm.analytics.test.tsx`
- `__tests__/app/(app)/people/YourConnections.test.tsx`

**Modify:**
- `next.config.ts` — wrap with `withSentryConfig`
- `lib/db/rounds.ts` — `maybeCompleteRound` returns `boolean`
- `app/(app)/scorecard/actions.ts` — `saveScore` returns `{ roundCompleted: boolean }`
- `components/app/scorecard/SkillList.tsx` — call `trackPillarScored` + `trackScorecardCompleted`
- `components/reflections/CreateRoundModal.tsx` — call `trackRoundStarted` on submit
- `app/(app)/reflections/[id]/page.tsx` — mount `<ReflectionViewTracker />`
- `components/app/GoalForm.tsx` — call `trackGoalCreated()` before server action
- `components/app/EvidenceLog.tsx` — call `trackGoalCheckin()` after server action
- `components/people/AddConnectionForm.tsx` — call `trackManagerInvited()` on success
- `app/(app)/people/YourConnections.tsx` — call `trackConnectionAccepted()` on accept click

---

## Pre-flight

Before starting, confirm the test suite is green:

```bash
npm test
```

Expected: all tests pass. Fix any failures before proceeding.

---

## Task 1: `lib/analytics.ts` — Analytics module

**Files:**
- Create: `lib/analytics.ts`

This module is not directly unit-tested (per spec — the functions are one-liner wrappers). Tests live in the components that call them.

- [ ] **Step 1: Create `lib/analytics.ts`**

```ts
// lib/analytics.ts
function gtag(event: string, params?: Record<string, unknown>) {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return
  window.gtag('event', event, params)
}

export function trackRoundStarted(title: string) {
  gtag('reflection_round_started', { title })
}

export function trackReflectionViewed(roundId: string, status: string) {
  gtag('reflection_viewed', { round_id: roundId, status })
}

export function trackRoundCompleted(roundId: string) {
  gtag('reflection_round_completed', { round_id: roundId })
}

export function trackPillarScored(pillar: string, level: string) {
  gtag('pillar_scored', { pillar, level })
}

export function trackScorecardCompleted() {
  gtag('scorecard_completed')
}

export function trackGoalCreated() {
  gtag('goal_created')
}

export function trackGoalCheckin() {
  gtag('goal_checkin')
}

export function trackManagerInvited() {
  gtag('manager_invited')
}

export function trackConnectionAccepted() {
  gtag('connection_accepted')
}
```

- [ ] **Step 2: Run the test suite to confirm nothing broke**

```bash
npm test
```

Expected: all existing tests pass (no new tests for this file).

- [ ] **Step 3: Commit**

```bash
git add lib/analytics.ts
git commit -m "feat: add analytics module with typed GA4 event functions"
```

---

## Task 2: Sentry — Install package and create config files

**Files:**
- Modify: `next.config.ts`
- Create: `sentry.client.config.ts`
- Create: `sentry.server.config.ts`
- Create: `instrumentation.ts`

**Before starting:** You need three environment variables. Add them to `.env.local` (for local dev) and Netlify build environment (for deploys):
- `NEXT_PUBLIC_SENTRY_DSN` — DSN from Sentry project settings (Client Keys)
- `SENTRY_ORG` — your Sentry org slug (the path segment after `sentry.io/organizations/`)
- `SENTRY_PROJECT` — your Sentry project slug (visible in Sentry → Projects)
- `SENTRY_AUTH_TOKEN` — personal auth token (Netlify only — never in `.env.local`)

- [ ] **Step 1: Install the Sentry package**

```bash
npm install @sentry/nextjs
```

- [ ] **Step 2: Create `sentry.client.config.ts`** (project root)

```ts
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  debug: false,
})
```

- [ ] **Step 3: Create `sentry.server.config.ts`** (project root)

```ts
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  debug: false,
})
```

- [ ] **Step 4: Create `instrumentation.ts`** (project root — Next.js instrumentation hook)

```ts
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config')
  }
}
```

- [ ] **Step 5: Wrap `next.config.ts` with `withSentryConfig`**

Current `next.config.ts`:
```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: '/scorecard/:pillar', destination: '/scorecard', permanent: false },
    ]
  },
};

export default nextConfig;
```

Replace with:
```ts
import type { NextConfig } from 'next'
import { withSentryConfig } from '@sentry/nextjs'

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: '/scorecard/:pillar', destination: '/scorecard', permanent: false },
    ]
  },
}

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  hideSourceMaps: true,
  disableLogger: true,
})
```

- [ ] **Step 6: Confirm the dev server starts**

```bash
npm run dev
```

Expected: server starts on http://localhost:3000 with no errors. Stop with Ctrl+C.

- [ ] **Step 7: Run tests**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 8: Commit**

```bash
git add sentry.client.config.ts sentry.server.config.ts instrumentation.ts next.config.ts package.json package-lock.json
git commit -m "feat: install @sentry/nextjs and add config files"
```

---

## Task 3: Sentry — Error boundaries

**Files:**
- Create: `app/global-error.tsx`
- Create: `app/(app)/error.tsx`
- Create: `__tests__/app/global-error.test.tsx`
- Create: `__tests__/app/app-error.test.tsx`

- [ ] **Step 1: Write the failing test for `app/(app)/error.tsx`**

Create `__tests__/app/app-error.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

const mockCaptureException = vi.fn()
vi.mock('@sentry/nextjs', () => ({ captureException: mockCaptureException }))

import AppError from '@/app/(app)/error'

describe('AppError boundary', () => {
  beforeEach(() => {
    mockCaptureException.mockReset()
  })

  it('renders "Something went wrong" fallback', () => {
    render(<AppError error={new Error('boom')} reset={() => {}} />)
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument()
  })

  it('renders a Try again button', () => {
    render(<AppError error={new Error('boom')} reset={() => {}} />)
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
  })

  it('calls reset() when Try again is clicked', () => {
    const reset = vi.fn()
    render(<AppError error={new Error('boom')} reset={reset} />)
    fireEvent.click(screen.getByRole('button', { name: /try again/i }))
    expect(reset).toHaveBeenCalled()
  })

  it('calls Sentry.captureException with the error', () => {
    const error = new Error('test error')
    render(<AppError error={error} reset={() => {}} />)
    expect(mockCaptureException).toHaveBeenCalledWith(error)
  })
})
```

- [ ] **Step 2: Write the failing test for `app/global-error.tsx`**

Create `__tests__/app/global-error.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

const mockCaptureException = vi.fn()
vi.mock('@sentry/nextjs', () => ({ captureException: mockCaptureException }))

import GlobalError from '@/app/global-error'

describe('GlobalError boundary', () => {
  beforeEach(() => {
    mockCaptureException.mockReset()
  })

  it('renders "Something went wrong" fallback', () => {
    render(<GlobalError error={new Error('boom')} reset={() => {}} />)
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument()
  })

  it('renders a Try again button', () => {
    render(<GlobalError error={new Error('boom')} reset={() => {}} />)
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
  })

  it('calls Sentry.captureException with the error', () => {
    const error = new Error('test error')
    render(<GlobalError error={error} reset={() => {}} />)
    expect(mockCaptureException).toHaveBeenCalledWith(error)
  })
})
```

- [ ] **Step 3: Run tests to confirm they fail**

```bash
npm test -- --reporter=verbose 2>&1 | grep -E "FAIL|PASS|Error"
```

Expected: both new test files fail with "Cannot find module" or similar.

- [ ] **Step 4: Create `app/(app)/error.tsx`**

```tsx
'use client'
import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20">
      <p className="text-slate-400">Something went wrong.</p>
      <button onClick={reset} className="text-sm text-amber-500 underline">
        Try again
      </button>
    </div>
  )
}
```

- [ ] **Step 5: Create `app/global-error.tsx`**

```tsx
'use client'
import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html>
      <body
        style={{
          background: '#0f172a',
          color: '#f1f5f9',
          fontFamily: 'sans-serif',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          margin: 0,
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <p style={{ marginBottom: 16 }}>Something went wrong.</p>
          <button
            onClick={reset}
            style={{
              color: '#f59e0b',
              textDecoration: 'underline',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}
```

- [ ] **Step 6: Run tests**

```bash
npm test
```

Expected: all tests pass including the new error boundary tests.

- [ ] **Step 7: Commit**

```bash
git add app/global-error.tsx app/\(app\)/error.tsx __tests__/app/global-error.test.tsx __tests__/app/app-error.test.tsx
git commit -m "feat: add Sentry-instrumented error boundaries"
```

---

## Task 4: Analytics — `CreateRoundModal` (round started)

**Files:**
- Modify: `components/reflections/CreateRoundModal.tsx`
- Modify: `__tests__/components/reflections/CreateRoundModal.test.tsx`

- [ ] **Step 1: Add the failing analytics test to the existing test file**

In `__tests__/components/reflections/CreateRoundModal.test.tsx`, add at the top (after the existing `vi.mock` for actions):

```tsx
const mockTrackRoundStarted = vi.fn()
vi.mock('@/lib/analytics', () => ({
  trackRoundStarted: (...args: unknown[]) => mockTrackRoundStarted(...args),
}))
```

Add to `beforeEach`:
```ts
mockTrackRoundStarted.mockReset()
```

Add this test inside the `describe` block:
```tsx
it('calls trackRoundStarted with the title when the form is submitted', () => {
  render(
    <CreateRoundModal open={true} onClose={() => {}} defaultTitle="Q2 2026" />
  )
  fireEvent.submit(screen.getByRole('form'))
  expect(mockTrackRoundStarted).toHaveBeenCalledWith('Q2 2026')
})
```

- [ ] **Step 2: Run to confirm the new test fails**

```bash
npm test -- CreateRoundModal
```

Expected: the new test fails (trackRoundStarted not called yet).

- [ ] **Step 3: Update `CreateRoundModal.tsx` to call `trackRoundStarted` on submit**

Add to the top of the file (after `'use client'`):
```tsx
import { trackRoundStarted } from '@/lib/analytics'
```

Add a `handleSubmit` function inside the component, before the return:
```tsx
const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
  const formData = new FormData(e.currentTarget)
  const title = (formData.get('title') as string) || ''
  trackRoundStarted(title)
}
```

Update the `<form>` tag to include `onSubmit`:
```tsx
<form action={createRoundAction} onSubmit={handleSubmit} aria-label="Create round form" className="flex flex-col gap-4">
```

- [ ] **Step 4: Run tests**

```bash
npm test -- CreateRoundModal
```

Expected: all tests pass including the new one.

- [ ] **Step 5: Run full suite**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add components/reflections/CreateRoundModal.tsx __tests__/components/reflections/CreateRoundModal.test.tsx
git commit -m "feat: track reflection_round_started analytics event"
```

---

## Task 5: Analytics — `ReflectionViewTracker` (reflection viewed)

**Files:**
- Create: `components/reflections/ReflectionViewTracker.tsx`
- Create: `__tests__/components/reflections/ReflectionViewTracker.test.tsx`
- Modify: `app/(app)/reflections/[id]/page.tsx`

- [ ] **Step 1: Write the failing test**

Create `__tests__/components/reflections/ReflectionViewTracker.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'

const mockTrackReflectionViewed = vi.fn()
vi.mock('@/lib/analytics', () => ({
  trackReflectionViewed: (...args: unknown[]) => mockTrackReflectionViewed(...args),
}))

import { ReflectionViewTracker } from '@/components/reflections/ReflectionViewTracker'

describe('ReflectionViewTracker', () => {
  beforeEach(() => {
    mockTrackReflectionViewed.mockReset()
  })

  it('calls trackReflectionViewed on mount with roundId and status', () => {
    render(<ReflectionViewTracker roundId="round-123" status="complete" />)
    expect(mockTrackReflectionViewed).toHaveBeenCalledWith('round-123', 'complete')
  })

  it('renders nothing visible', () => {
    const { container } = render(
      <ReflectionViewTracker roundId="round-123" status="in_progress" />
    )
    expect(container.firstChild).toBeNull()
  })
})
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm test -- ReflectionViewTracker
```

Expected: fails with "Cannot find module".

- [ ] **Step 3: Create `components/reflections/ReflectionViewTracker.tsx`**

```tsx
'use client'
import { useEffect } from 'react'
import { trackReflectionViewed } from '@/lib/analytics'

interface ReflectionViewTrackerProps {
  roundId: string
  status: string
}

export function ReflectionViewTracker({ roundId, status }: ReflectionViewTrackerProps) {
  useEffect(() => {
    trackReflectionViewed(roundId, status)
  }, [roundId, status])

  return null
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test -- ReflectionViewTracker
```

Expected: both tests pass.

- [ ] **Step 5: Add `ReflectionViewTracker` to `app/(app)/reflections/[id]/page.tsx`**

Open `app/(app)/reflections/[id]/page.tsx`. Add the import near the top with the other component imports:

```tsx
import { ReflectionViewTracker } from '@/components/reflections/ReflectionViewTracker'
```

Inside the returned JSX (just inside the top-level `<div>`), add the tracker as the first child:

```tsx
<ReflectionViewTracker roundId={round.id} status={round.status} />
```

- [ ] **Step 6: Run full suite**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add components/reflections/ReflectionViewTracker.tsx __tests__/components/reflections/ReflectionViewTracker.test.tsx app/\(app\)/reflections/\[id\]/page.tsx
git commit -m "feat: track reflection_viewed analytics event on detail page"
```

---

## Task 6: Analytics — Scorecard (pillar scored + scorecard completed)

**Files:**
- Modify: `lib/db/rounds.ts` (lines 53–67 — `maybeCompleteRound`)
- Modify: `app/(app)/scorecard/actions.ts`
- Modify: `components/app/scorecard/SkillList.tsx`
- Create: `__tests__/components/app/scorecard/SkillList.test.tsx`

- [ ] **Step 1: Modify `maybeCompleteRound` to return `boolean`**

In `lib/db/rounds.ts`, change `maybeCompleteRound` from `Promise<void>` to `Promise<boolean>`:

```ts
export async function maybeCompleteRound(roundId: string): Promise<boolean> {
  const supabase = await createClient()
  const { data: scores } = await supabase
    .from('scores')
    .select('pillar')
    .eq('round_id', roundId)

  const scoredPillars = new Set((scores ?? []).map((s: { pillar: string }) => s.pillar))
  if (PILLARS.every(p => scoredPillars.has(p))) {
    await supabase
      .from('assessment_rounds')
      .update({ status: 'complete', completed_at: new Date().toISOString() })
      .eq('id', roundId)
    return true
  }
  return false
}
```

- [ ] **Step 2: Modify `saveScore` to return `{ roundCompleted: boolean }`**

In `app/(app)/scorecard/actions.ts`, change the return type and use the new `maybeCompleteRound` return value:

```ts
'use server'
import { createClient } from '@/lib/supabase/server'
import { upsertScore } from '@/lib/db/scores'
import { maybeCompleteRound } from '@/lib/db/rounds'
import { logAudit } from '@/lib/audit'
import type { Level } from '@/lib/skills'

export async function saveScore(
  roundId: string,
  pillar: string,
  skillKey: string,
  level: Level
): Promise<{ roundCompleted: boolean }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  await upsertScore(roundId, pillar, skillKey, level)
  const roundCompleted = await maybeCompleteRound(roundId)

  await logAudit({
    actorId: user.id,
    action: 'scorecard.submit',
    entityType: 'score',
    entityId: roundId,
    metadata: { pillar, skillKey, level },
  })

  return { roundCompleted }
}
```

- [ ] **Step 3: Write the failing SkillList test**

Create `__tests__/components/app/scorecard/SkillList.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import type { Skill } from '@/lib/skills'

const mockSaveScore = vi.fn()
vi.mock('@/app/(app)/scorecard/actions', () => ({
  saveScore: (...args: unknown[]) => mockSaveScore(...args),
}))

const mockTrackPillarScored = vi.fn()
const mockTrackScorecardCompleted = vi.fn()
vi.mock('@/lib/analytics', () => ({
  trackPillarScored: (...args: unknown[]) => mockTrackPillarScored(...args),
  trackScorecardCompleted: () => mockTrackScorecardCompleted(),
}))

import { SkillList } from '@/components/app/scorecard/SkillList'

const mockSkill: Skill = {
  key: 'self-awareness',
  pillar: 'self',
  label: 'Self Awareness',
  description: 'Understanding yourself.',
}

describe('SkillList analytics', () => {
  beforeEach(() => {
    mockSaveScore.mockReset()
    mockTrackPillarScored.mockReset()
    mockTrackScorecardCompleted.mockReset()
  })

  it('calls trackPillarScored after a successful score save', async () => {
    mockSaveScore.mockResolvedValue({ roundCompleted: false })
    render(
      <SkillList
        skills={[mockSkill]}
        scores={{}}
        roundId="round-1"
        activeSkillKey="self-awareness"
        onSkillActivate={vi.fn()}
        onScore={vi.fn()}
      />
    )
    const proficientButton = screen.getByRole('button', { name: /proficient/i })
    await act(async () => { fireEvent.click(proficientButton) })
    expect(mockTrackPillarScored).toHaveBeenCalledWith('self', 'Proficient')
  })

  it('calls trackScorecardCompleted when saveScore returns roundCompleted: true', async () => {
    mockSaveScore.mockResolvedValue({ roundCompleted: true })
    render(
      <SkillList
        skills={[mockSkill]}
        scores={{}}
        roundId="round-1"
        activeSkillKey="self-awareness"
        onSkillActivate={vi.fn()}
        onScore={vi.fn()}
      />
    )
    const proficientButton = screen.getByRole('button', { name: /proficient/i })
    await act(async () => { fireEvent.click(proficientButton) })
    expect(mockTrackScorecardCompleted).toHaveBeenCalled()
  })

  it('does not call trackScorecardCompleted when roundCompleted is false', async () => {
    mockSaveScore.mockResolvedValue({ roundCompleted: false })
    render(
      <SkillList
        skills={[mockSkill]}
        scores={{}}
        roundId="round-1"
        activeSkillKey="self-awareness"
        onSkillActivate={vi.fn()}
        onScore={vi.fn()}
      />
    )
    const proficientButton = screen.getByRole('button', { name: /proficient/i })
    await act(async () => { fireEvent.click(proficientButton) })
    expect(mockTrackScorecardCompleted).not.toHaveBeenCalled()
  })

  it('does not call trackPillarScored when saveScore throws', async () => {
    mockSaveScore.mockRejectedValue(new Error('save failed'))
    render(
      <SkillList
        skills={[mockSkill]}
        scores={{}}
        roundId="round-1"
        activeSkillKey="self-awareness"
        onSkillActivate={vi.fn()}
        onScore={vi.fn()}
      />
    )
    const proficientButton = screen.getByRole('button', { name: /proficient/i })
    await act(async () => { fireEvent.click(proficientButton) })
    expect(mockTrackPillarScored).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 4: Run to confirm failure**

```bash
npm test -- SkillList
```

Expected: tests fail (trackPillarScored not yet called in SkillList).

- [ ] **Step 5: Update `SkillList.tsx` to call analytics in the transition**

Add the import at the top of `components/app/scorecard/SkillList.tsx`:

```tsx
import { trackPillarScored, trackScorecardCompleted } from '@/lib/analytics'
```

Update `handleRate` to call analytics after a successful save (replace the current `startTransition` block):

```tsx
startTransition(async () => {
  try {
    const { roundCompleted } = await saveScore(roundId, skill.pillar, skill.key, level)
    trackPillarScored(skill.pillar, level)
    if (roundCompleted) trackScorecardCompleted()
  } catch {
    onScore(skill.key, previousLevel)
  }
})
```

- [ ] **Step 6: Run tests**

```bash
npm test -- SkillList
```

Expected: all four new tests pass.

- [ ] **Step 7: Run full suite**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 8: Commit**

```bash
git add lib/db/rounds.ts app/\(app\)/scorecard/actions.ts components/app/scorecard/SkillList.tsx __tests__/components/app/scorecard/SkillList.test.tsx
git commit -m "feat: track pillar_scored and scorecard_completed analytics events"
```

---

## Task 7: Analytics — Growth (goal created + goal checkin)

**Files:**
- Modify: `components/app/GoalForm.tsx`
- Modify: `components/app/EvidenceLog.tsx`
- Create: `__tests__/components/app/GoalForm.test.tsx`
- Create: `__tests__/components/app/EvidenceLog.test.tsx`

- [ ] **Step 1: Write the failing GoalForm test**

Create `__tests__/components/app/GoalForm.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'

const mockSaveGoalAction = vi.fn()
vi.mock('@/app/(app)/growth/actions', () => ({
  saveGoalAction: (...args: unknown[]) => mockSaveGoalAction(...args),
}))

const mockTrackGoalCreated = vi.fn()
vi.mock('@/lib/analytics', () => ({
  trackGoalCreated: () => mockTrackGoalCreated(),
}))

import { GoalForm } from '@/components/app/GoalForm'

describe('GoalForm analytics', () => {
  beforeEach(() => {
    mockSaveGoalAction.mockReset()
    mockTrackGoalCreated.mockReset()
    mockSaveGoalAction.mockResolvedValue(undefined)
  })

  it('calls trackGoalCreated when the form is submitted', async () => {
    render(
      <GoalForm
        initialSkillKey="self-awareness"
        resources={[]}
        allSkillsForSelector={[
          { key: 'self-awareness', label: 'Self Awareness', pillar: 'self' },
        ]}
      />
    )
    const goalInput = screen.getByRole('textbox', { name: /goal/i })
    fireEvent.change(goalInput, { target: { value: 'Improve my listening skills' } })
    await act(async () => { fireEvent.submit(goalInput.closest('form')!) })
    expect(mockTrackGoalCreated).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Write the failing EvidenceLog test**

Create `__tests__/components/app/EvidenceLog.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'

const mockAddEvidenceAction = vi.fn()
vi.mock('@/app/(app)/growth/actions', () => ({
  addEvidenceAction: (...args: unknown[]) => mockAddEvidenceAction(...args),
}))

const mockTrackGoalCheckin = vi.fn()
vi.mock('@/lib/analytics', () => ({
  trackGoalCheckin: () => mockTrackGoalCheckin(),
}))

import { EvidenceLog } from '@/components/app/EvidenceLog'

describe('EvidenceLog analytics', () => {
  beforeEach(() => {
    mockAddEvidenceAction.mockReset()
    mockTrackGoalCheckin.mockReset()
    mockAddEvidenceAction.mockResolvedValue(undefined)
  })

  it('calls trackGoalCheckin after evidence is submitted', async () => {
    render(<EvidenceLog planId="plan-1" entries={[]} />)

    fireEvent.click(screen.getByRole('button', { name: /add evidence/i }))

    const whatInput = screen.getByRole('textbox', { name: /what did you do/i })
    const impactInput = screen.getByRole('textbox', { name: /impact/i })
    fireEvent.change(whatInput, { target: { value: 'Ran a 1:1 session' } })
    fireEvent.change(impactInput, { target: { value: 'Team felt heard' } })

    await act(async () => { fireEvent.submit(whatInput.closest('form')!) })
    expect(mockTrackGoalCheckin).toHaveBeenCalled()
  })
})
```

- [ ] **Step 3: Run to confirm failures**

```bash
npm test -- GoalForm EvidenceLog
```

Expected: both test files fail.

- [ ] **Step 4: Update `GoalForm.tsx` to call `trackGoalCreated`**

Add to imports at top of `components/app/GoalForm.tsx`:
```tsx
import { trackGoalCreated } from '@/lib/analytics'
```

In the `<form>` action handler, add `trackGoalCreated()` before `saveGoalAction` (optimistic — fires before redirect):

```tsx
<form action={async (fd: FormData) => {
  fd.set('resource_ids', JSON.stringify(pinnedIds))
  if (checkinValue) fd.set('checkin_frequency_weeks', checkinValue)
  trackGoalCreated()
  await saveGoalAction(fd)
}}>
```

- [ ] **Step 5: Update `EvidenceLog.tsx` to call `trackGoalCheckin`**

Add to imports at top of `components/app/EvidenceLog.tsx`:
```tsx
import { trackGoalCheckin } from '@/lib/analytics'
```

In the evidence form action, add `trackGoalCheckin()` after `addEvidenceAction` succeeds (it doesn't redirect, so code continues):

```tsx
action={async (fd: FormData) => {
  fd.set('plan_id', planId)
  await addEvidenceAction(fd)
  trackGoalCheckin()
  setShowForm(false)
}}
```

- [ ] **Step 6: Run tests**

```bash
npm test -- GoalForm EvidenceLog
```

Expected: all tests pass.

- [ ] **Step 7: Run full suite**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 8: Commit**

```bash
git add components/app/GoalForm.tsx components/app/EvidenceLog.tsx __tests__/components/app/GoalForm.test.tsx __tests__/components/app/EvidenceLog.test.tsx
git commit -m "feat: track goal_created and goal_checkin analytics events"
```

---

## Task 8: Analytics — Connections (invite + accept)

**Files:**
- Modify: `components/people/AddConnectionForm.tsx`
- Modify: `app/(app)/people/YourConnections.tsx`
- Create: `__tests__/components/people/AddConnectionForm.analytics.test.tsx`
- Create: `__tests__/app/(app)/people/YourConnections.test.tsx`

- [ ] **Step 1: Write the failing AddConnectionForm analytics test**

Create `__tests__/components/people/AddConnectionForm.analytics.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'

const mockUseActionState = vi.fn()
vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react')
  return { ...actual, useActionState: mockUseActionState }
})

const mockTrackManagerInvited = vi.fn()
vi.mock('@/lib/analytics', () => ({
  trackManagerInvited: () => mockTrackManagerInvited(),
}))

import { AddConnectionForm } from '@/components/people/AddConnectionForm'

describe('AddConnectionForm analytics', () => {
  beforeEach(() => {
    mockTrackManagerInvited.mockReset()
  })

  it('calls trackManagerInvited when invitation succeeds', () => {
    mockUseActionState.mockReturnValue([{ success: true }, vi.fn(), false])
    render(<AddConnectionForm />)
    expect(mockTrackManagerInvited).toHaveBeenCalled()
  })

  it('does not call trackManagerInvited when invitation has not succeeded', () => {
    mockUseActionState.mockReturnValue([{ success: false }, vi.fn(), false])
    render(<AddConnectionForm />)
    expect(mockTrackManagerInvited).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Write the failing YourConnections accept test**

Create `__tests__/app/(app)/people/YourConnections.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import type { EnrichedConnection } from '@/app/(app)/people/types'

const mockAcceptConnectionAction = vi.fn()
vi.mock('@/app/(app)/connections/actions', () => ({
  acceptConnectionAction: (...args: unknown[]) => mockAcceptConnectionAction(...args),
  inviteConnection: vi.fn(),
}))

vi.mock('@/components/people/InviteManagerModal', () => ({
  InviteManagerModal: () => null,
}))

vi.mock('@/components/people/AddConnectionForm', () => ({
  AddConnectionForm: () => null,
}))

const mockTrackConnectionAccepted = vi.fn()
vi.mock('@/lib/analytics', () => ({
  trackConnectionAccepted: () => mockTrackConnectionAccepted(),
  trackManagerInvited: vi.fn(),
}))

import { YourConnections } from '@/app/(app)/people/YourConnections'

const pendingConnection: EnrichedConnection = {
  id: 'conn-1',
  manager_id: 'manager-id',
  direct_report_id: 'user-id',
  status: 'pending',
  initiated_by: 'manager-id',
  created_at: '2026-05-21T00:00:00Z',
  manager: { id: 'manager-id', email: 'manager@example.com', display_name: 'Alice' },
  direct_report: { id: 'user-id', email: 'me@example.com', display_name: 'Me' },
}

describe('YourConnections analytics', () => {
  beforeEach(() => {
    mockTrackConnectionAccepted.mockReset()
    mockAcceptConnectionAction.mockReset()
  })

  it('calls trackConnectionAccepted when the Accept button is clicked', () => {
    render(
      <YourConnections
        connections={{ asManager: [], asDirectReport: [pendingConnection] }}
        roundSummaries={{}}
        userId="user-id"
        pendingInvitations={[]}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /accept/i }))
    expect(mockTrackConnectionAccepted).toHaveBeenCalled()
  })
})
```

- [ ] **Step 3: Run to confirm failures**

```bash
npm test -- AddConnectionForm.analytics YourConnections
```

Expected: both test files fail.

- [ ] **Step 4: Update `AddConnectionForm.tsx` to track on success**

Add to imports:
```tsx
import { useEffect } from 'react'
import { trackManagerInvited } from '@/lib/analytics'
```

Note: `useEffect` may already be imported — check first and add only if missing.

Inside the `AddConnectionForm` function body, after the `useActionState` line, add:

```tsx
useEffect(() => {
  if (state.success) trackManagerInvited()
}, [state.success])
```

- [ ] **Step 5: Update `YourConnections.tsx` to track on accept**

Add to imports at the top of `app/(app)/people/YourConnections.tsx`:
```tsx
import { trackConnectionAccepted } from '@/lib/analytics'
```

Find the Accept button (line ~152). It is inside a `<form>` with `action={acceptConnectionAction.bind(null, c.id)}`. Add an `onClick` to the submit button:

```tsx
<form action={acceptConnectionAction.bind(null, c.id)}>
  <button
    type="submit"
    onClick={() => trackConnectionAccepted()}
    // ... existing style props unchanged
  >
    Accept
  </button>
</form>
```

Search for the text "Accept" in the file to find the exact button. Do not change any other part of the button — only add the `onClick` prop.

- [ ] **Step 6: Run tests**

```bash
npm test -- AddConnectionForm.analytics YourConnections
```

Expected: all tests pass.

- [ ] **Step 7: Run full suite**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 8: Commit**

```bash
git add components/people/AddConnectionForm.tsx app/\(app\)/people/YourConnections.tsx __tests__/components/people/AddConnectionForm.analytics.test.tsx __tests__/app/\(app\)/people/YourConnections.test.tsx
git commit -m "feat: track manager_invited and connection_accepted analytics events"
```

---

## Final check

- [ ] **Run the full test suite one last time**

```bash
npm test
```

Expected: all tests pass (existing + all new tests).

- [ ] **Verify the build succeeds**

```bash
npm run build
```

Expected: build completes with no errors. If `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`, or `SENTRY_PROJECT` are missing, the build may warn — that's acceptable locally. Deploys will have them set in Netlify.
