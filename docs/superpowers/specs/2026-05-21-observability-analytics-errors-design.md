# Observability: Analytics Events + Error Monitoring Design

## Goal

Add custom GA4 event tracking across all key user actions, and wire up Sentry for server + client error monitoring with source maps.

## Context

Google Analytics (`G-1BSMVXG0PJ`) is already initialised in `app/layout.tsx` with `anonymize_ip: true` and tracks pageviews automatically. No custom events exist. No error monitoring exists.

---

## 1. Analytics Event Layer

### Architecture

A single module `lib/analytics.ts` exports one typed function per tracked event. Each function is SSR-safe (guards `typeof window === 'undefined'`) and calls `window.gtag('event', ...)` directly. No provider, no React hook, no abstraction layer beyond named functions.

This approach makes every tracking call grep-able, keeps event names defined in one place, and makes tests trivial — mock the module, assert the function.

### Events

| Function | GA4 event name | Parameters | Fires in |
|---|---|---|---|
| `trackRoundStarted(roundId, title)` | `reflection_round_started` | `round_id`, `title` | `CreateRoundModal` on success |
| `trackReflectionViewed(roundId, status)` | `reflection_viewed` | `round_id`, `status` | `/reflections/[id]` client wrapper on mount |
| `trackRoundCompleted(roundId)` | `reflection_round_completed` | `round_id` | When `maybeCompleteRound` transitions status to `complete` |
| `trackPillarScored(pillar, level)` | `pillar_scored` | `pillar`, `level` | Scorecard save action |
| `trackScorecardCompleted()` | `scorecard_completed` | — | Same transition as `trackRoundCompleted` |
| `trackGoalCreated()` | `goal_created` | — | Growth page goal form submit |
| `trackGoalCheckin()` | `goal_checkin` | — | Growth page check-in action |
| `trackManagerInvited()` | `manager_invited` | — | Invite modal submit |
| `trackConnectionAccepted()` | `connection_accepted` | — | Accept invite action |

### Implementation shape

```ts
// lib/analytics.ts
function gtag(event: string, params?: Record<string, unknown>) {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return
  window.gtag('event', event, params)
}

export function trackRoundStarted(roundId: string, title: string) {
  gtag('reflection_round_started', { round_id: roundId, title })
}
// … one function per event
```

### Where events fire

- **`CreateRoundModal`** — call `trackRoundStarted` after the server action resolves successfully
- **`/reflections/[id]`** — needs a thin `'use client'` wrapper component that calls `trackReflectionViewed` in a `useEffect` on mount (the page itself is a server component)
- **Scorecard save action** (`app/(app)/scorecard/actions.ts` or equivalent) — call `trackPillarScored`; call `trackRoundCompleted` + `trackScorecardCompleted` when `maybeCompleteRound` completes a round
- **Growth page** — call `trackGoalCreated` / `trackGoalCheckin` at the point of form submission
- **Connections / org invite flow** — call `trackManagerInvited` on invite submit; call `trackConnectionAccepted` on accept

---

## 2. Sentry Error Monitoring

### Package

`@sentry/nextjs` — official SDK with full Next.js App Router support.

### New files

| File | Purpose |
|---|---|
| `sentry.client.config.ts` | Browser Sentry init — captures client JS errors and unhandled promise rejections |
| `sentry.server.config.ts` | Node.js Sentry init — captures server component, API route, and server action exceptions |
| `instrumentation.ts` | Next.js instrumentation hook — registers server config on startup |
| `app/global-error.tsx` | Next.js global error boundary — renders fallback UI, calls `Sentry.captureException` |
| `app/(app)/error.tsx` | App-shell error boundary — scoped to authenticated routes |

### Modified files

| File | Change |
|---|---|
| `next.config.ts` | Wrapped with `withSentryConfig` for source map upload at build time |

### Sentry config options

```ts
// sentry.client.config.ts and sentry.server.config.ts
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,        // 10% performance traces — bonus, not primary goal
  replaysSessionSampleRate: 0,  // no session replay
  replaysOnErrorSampleRate: 0,  // no session replay on error
  ignoreErrors: [
    /NEXT_NOT_FOUND/,           // filter expected 404s
  ],
})
```

### Error boundary pattern

```tsx
// app/(app)/error.tsx
'use client'
import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
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

`global-error.tsx` follows the same pattern but must also include `<html>` and `<body>` tags (Next.js requirement for global error).

### New environment variables

| Variable | Where |
|---|---|
| `NEXT_PUBLIC_SENTRY_DSN` | `.env.local` + Netlify build env |
| `SENTRY_AUTH_TOKEN` | Netlify build env only (never committed) |

### What's captured automatically

- Unhandled server component, API route, and server action exceptions
- Unhandled client-side JS errors
- Unhandled promise rejections

Expected 4xx responses and Next.js not-found navigation are filtered from the error feed.

---

## 3. Testing

### Analytics

Tests mock `lib/analytics.ts` as a module and assert the correct function is called with the right arguments when a user action occurs. The analytics functions themselves are not unit-tested — they are one-liner wrappers around `window.gtag`.

```ts
vi.mock('@/lib/analytics', () => ({
  trackRoundStarted: vi.fn(),
  trackPillarScored: vi.fn(),
  // … etc
}))

it('calls trackRoundStarted on successful submit', async () => {
  // render + fill form + submit
  expect(trackRoundStarted).toHaveBeenCalledWith(expect.any(String), 'Q2 2026')
})
```

### Sentry / error boundaries

Tests mock `@sentry/nextjs` and verify that error boundaries render fallback UI and call `captureException`:

```ts
vi.mock('@sentry/nextjs', () => ({ captureException: vi.fn() }))

it('renders fallback and reports to Sentry when a child throws', () => {
  render(
    <ErrorBoundary>
      <ThrowingComponent />
    </ErrorBoundary>
  )
  expect(screen.getByText(/something went wrong/i)).toBeInTheDocument()
  expect(captureException).toHaveBeenCalledWith(expect.any(Error))
})
```

External network calls to GA and Sentry are not tested.

---

## Out of scope

- Session replay (privacy + cost)
- Performance tracing beyond the 10% sample rate bonus
- Custom Sentry dashboards or alert rules (configure in Sentry UI after data starts flowing)
- Analytics for admin routes
