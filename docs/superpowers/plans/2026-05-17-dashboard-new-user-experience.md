# Dashboard New User Experience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the sparse dashboard empty state with a compelling CTA + four benefit strips, and add a 5-step spotlight tour (driver.js) launched from a prominent teal trigger button.

**Architecture:** A new `DashboardTour` client component encapsulates all driver.js logic and localStorage persistence (`bm_tour_seen`). Stable `id` attributes are added to existing nav items so driver.js can spotlight them by CSS selector. The dashboard page's `if (!round)` branch is rewritten in place — no new routes, no API calls, no DB changes.

**Tech Stack:** Next.js 14 App Router, TypeScript, driver.js v1.x, Vitest + React Testing Library, lucide-react (already installed)

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `components/app/NavItem.tsx` | Modify | Accept optional `id` prop, forward to `<Link>` |
| `components/app/Sidebar.tsx` | Modify | Pass tour `id` to Dashboard, Growth, Connections nav items |
| `components/app/AvatarDropdown.tsx` | Modify | Add `id="nav-avatar"` to avatar button |
| `components/dashboard/DashboardTour.tsx` | Create | Client component: tour trigger button + driver.js config |
| `__tests__/components/dashboard/DashboardTour.test.tsx` | Create | Unit tests for DashboardTour |
| `app/(app)/dashboard/page.tsx` | Modify | Replace empty state (lines 34–48) with new design |
| `app/globals.css` | Modify | driver.js popover dark-theme overrides |

---

### Task 1: Install driver.js

**Files:**
- Modify: `package.json` (via npm)

- [ ] **Step 1: Install the package**

```bash
npm install driver.js
```

- [ ] **Step 2: Verify it landed in dependencies (not devDependencies)**

```bash
grep '"driver.js"' package.json
```

Expected output: `"driver.js": "^1.x.x"` under `"dependencies"`.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install driver.js for spotlight tour"
```

---

### Task 2: Add `id` attributes to tour target elements

**Files:**
- Modify: `components/app/NavItem.tsx`
- Modify: `components/app/Sidebar.tsx`
- Modify: `components/app/AvatarDropdown.tsx`

driver.js positions its spotlight by querying `document.querySelector(element)`. These IDs are the stable selectors. Add them before building DashboardTour so Task 3 can reference them.

- [ ] **Step 1: Add optional `id` prop to NavItem**

Open `components/app/NavItem.tsx`. The current interface is:

```tsx
interface NavItemProps {
  href: string
  icon: LucideIcon
  label: string
  isExpanded: boolean
}
```

Update it to:

```tsx
interface NavItemProps {
  href: string
  icon: LucideIcon
  label: string
  isExpanded: boolean
  id?: string
}
```

Update the function signature to destructure `id`:

```tsx
export function NavItem({ href, icon: Icon, label, isExpanded, id }: NavItemProps) {
```

Add `id={id}` to the `<Link>` element (currently line 18). The full updated `<Link>` opening tag:

```tsx
    <Link
      id={id}
      href={href}
      aria-current={isActive ? 'page' : undefined}
      title={!isExpanded ? label : undefined}
      style={{
```

All other code in NavItem.tsx is unchanged.

- [ ] **Step 2: Pass IDs from Sidebar**

Open `components/app/Sidebar.tsx`. Replace the `NAV_ITEMS` constant:

```tsx
const NAV_ITEMS = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', id: 'nav-dashboard' },
  { href: '/growth', icon: TrendingUp, label: 'Growth', id: 'nav-growth' },
  { href: '/connections', icon: Link2, label: 'Connections', id: 'nav-connections' },
  { href: '/organisation', icon: Network, label: 'Organisation' },
] as const
```

Update the `NavItem` render in the map (currently passes 4 props — add `id`):

```tsx
      {NAV_ITEMS.map(item => (
        <NavItem
          key={item.href}
          href={item.href}
          icon={item.icon}
          label={item.label}
          isExpanded={isExpanded}
          id={'id' in item ? item.id : undefined}
        />
      ))}
```

- [ ] **Step 3: Add `id` to avatar button in AvatarDropdown**

Open `components/app/AvatarDropdown.tsx`. Find the `<button>` at approximately line 37 (the one with `aria-label="Open user menu"`). Add `id="nav-avatar"` as the first prop:

```tsx
      <button
        id="nav-avatar"
        onClick={() => setOpen(o => !o)}
        aria-label="Open user menu"
        aria-expanded={open}
```

All other code in AvatarDropdown.tsx is unchanged.

- [ ] **Step 4: Run tests to confirm no regressions**

```bash
npx vitest run
```

Expected: all existing tests pass. No new tests are needed for these changes — they are mechanical attribute additions with no new behaviour.

- [ ] **Step 5: Commit**

```bash
git add components/app/NavItem.tsx components/app/Sidebar.tsx components/app/AvatarDropdown.tsx
git commit -m "feat: add tour target ids to nav items and avatar button"
```

---

### Task 3: Build DashboardTour client component (TDD)

**Files:**
- Create: `__tests__/components/dashboard/DashboardTour.test.tsx`
- Create: `components/dashboard/DashboardTour.tsx`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/components/dashboard/DashboardTour.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DashboardTour } from '@/components/dashboard/DashboardTour'

const mockDrive = vi.fn()
const mockDestroy = vi.fn()
let capturedOnDestroyStarted: (() => void) | undefined
let capturedSteps: unknown[] = []

vi.mock('driver.js', () => ({
  driver: vi.fn((config: { onDestroyStarted?: () => void; steps?: unknown[] }) => {
    capturedOnDestroyStarted = config.onDestroyStarted
    capturedSteps = config.steps ?? []
    return { drive: mockDrive, destroy: mockDestroy }
  }),
}))

vi.mock('driver.js/dist/driver.css', () => ({}))

beforeEach(() => {
  mockDrive.mockReset()
  mockDestroy.mockReset()
  localStorage.clear()
  capturedOnDestroyStarted = undefined
  capturedSteps = []
})

describe('DashboardTour', () => {
  it('renders the tour trigger button', () => {
    render(<DashboardTour />)
    expect(screen.getByRole('button', { name: /take a 30-second tour/i })).toBeTruthy()
  })

  it('starts the driver tour when the button is clicked', () => {
    render(<DashboardTour />)
    fireEvent.click(screen.getByRole('button', { name: /take a 30-second tour/i }))
    expect(mockDrive).toHaveBeenCalledTimes(1)
  })

  it('configures driver.js with exactly 5 steps', () => {
    render(<DashboardTour />)
    fireEvent.click(screen.getByRole('button', { name: /take a 30-second tour/i }))
    expect(capturedSteps).toHaveLength(5)
  })

  it('sets bm_tour_seen in localStorage when the tour ends', () => {
    render(<DashboardTour />)
    fireEvent.click(screen.getByRole('button', { name: /take a 30-second tour/i }))
    capturedOnDestroyStarted?.()
    expect(localStorage.getItem('bm_tour_seen')).toBe('1')
  })

  it('calls driver.destroy() when the tour ends', () => {
    render(<DashboardTour />)
    fireEvent.click(screen.getByRole('button', { name: /take a 30-second tour/i }))
    capturedOnDestroyStarted?.()
    expect(mockDestroy).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx vitest run __tests__/components/dashboard/DashboardTour.test.tsx
```

Expected: 5 failures — `Cannot find module '@/components/dashboard/DashboardTour'`.

- [ ] **Step 3: Create the component**

Create `components/dashboard/DashboardTour.tsx`:

```tsx
'use client'

import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'

const TOUR_STEPS = [
  {
    element: '#nav-dashboard',
    popover: {
      title: 'Your command centre',
      description:
        "This is your dashboard — a live picture of where you stand as a manager. Once you've completed a scorecard, your radar, pillar scores, and growth goals all live here.",
    },
  },
  {
    element: '#nav-growth',
    popover: {
      title: "Track what you're working on",
      description:
        'The Growth section shows your active development goals and how your scores have shifted between rounds. Set a goal on any skill and revisit it at your next 1:1.',
    },
  },
  {
    element: '#nav-connections',
    popover: {
      title: 'Your management relationships',
      description:
        'Connections tracks the people in your world — direct reports, peers, and stakeholders. Use it to log what matters about your working relationships.',
    },
  },
  {
    element: '#nav-avatar',
    popover: {
      title: 'Your profile',
      description:
        'Your account settings and scorecard history live here. You can also download or share your scorecard from this menu.',
    },
  },
  {
    element: '#dashboard-cta-btn',
    popover: {
      title: 'Ready to get started?',
      description:
        'Your first scorecard takes about ten minutes. Answer honestly — there are no right answers, only useful ones.',
    },
  },
]

export function DashboardTour() {
  function startTour() {
    const driverObj = driver({
      animate: true,
      smoothScroll: true,
      allowClose: true,
      stagePadding: 6,
      stageRadius: 8,
      popoverClass: 'bm-tour-popover',
      steps: TOUR_STEPS,
      onDestroyStarted: () => {
        driverObj.destroy()
        try {
          localStorage.setItem('bm_tour_seen', '1')
        } catch {
          // localStorage unavailable in some private browsing contexts
        }
      },
    })

    driverObj.drive()
  }

  return (
    <button
      onClick={startTour}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10,
        background: 'rgba(45,212,191,0.08)',
        border: '1px solid rgba(45,212,191,0.35)',
        borderRadius: 12,
        padding: '11px 20px',
        fontSize: 13,
        fontWeight: 600,
        color: '#2dd4bf',
        cursor: 'pointer',
        letterSpacing: '0.01em',
        marginBottom: 32,
      }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <polygon points="5,3 19,12 5,21" />
      </svg>
      <span style={{ display: 'flex', flexDirection: 'column', gap: 1, textAlign: 'left' }}>
        <span>Take a 30-second tour of Brilliant Managers</span>
        <span style={{ fontSize: 11, fontWeight: 400, color: 'rgba(45,212,191,0.55)' }}>
          Let us show you around the tool
        </span>
      </span>
    </button>
  )
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx vitest run __tests__/components/dashboard/DashboardTour.test.tsx
```

Expected: 5/5 passing.

- [ ] **Step 5: Commit**

```bash
git add components/dashboard/DashboardTour.tsx __tests__/components/dashboard/DashboardTour.test.tsx
git commit -m "feat: add DashboardTour component with driver.js spotlight tour"
```

---

### Task 4: Update dashboard empty state

**Files:**
- Modify: `app/(app)/dashboard/page.tsx` (lines 1–49)

The current empty state (lines 34–48) is replaced with the new design. The populated-state code (line 50 onwards) is untouched.

- [ ] **Step 1: Add imports at the top of dashboard/page.tsx**

The file currently starts with these imports (lines 1–22). Add two new import lines:

```tsx
// app/(app)/dashboard/page.tsx
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Lightbulb, Search, TrendingUp, MessageSquare, type LucideIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { DashboardTour } from '@/components/dashboard/DashboardTour'
import { getLatestCompleteRound, getPreviousCompleteRound, getInProgressRound } from '@/lib/db/rounds'
// ... rest of existing imports unchanged
```

The two new imports are:
- `{ Lightbulb, Search, TrendingUp, MessageSquare, type LucideIcon }` from `'lucide-react'`
- `{ DashboardTour }` from `'@/components/dashboard/DashboardTour'`

`TrendingUp` is already imported via Sidebar — lucide-react is already a dependency, just import from it here too.

- [ ] **Step 2: Add the BENEFIT_STRIPS constant after the imports, before `export default`**

Insert this block immediately before `export default async function DashboardPage()`:

```tsx
const BENEFIT_STRIPS: Array<{ Icon: LucideIcon; title: string; desc: string }> = [
  {
    Icon: Lightbulb,
    title: 'See exactly where you stand',
    desc: 'A radar across all six pillars shows your strengths and gaps at a glance.',
  },
  {
    Icon: Search,
    title: 'Know where to focus first',
    desc: "Your lowest pillar is flagged automatically so you're never guessing what to work on.",
  },
  {
    Icon: TrendingUp,
    title: 'Track growth round to round',
    desc: 'Rescore yourself every few months and watch your progress trend over time.',
  },
  {
    Icon: MessageSquare,
    title: 'A ready-made discussion starter with your manager',
    desc: 'Share your scorecard snapshot — a structured starting point for a real conversation.',
  },
]
```

- [ ] **Step 3: Replace the empty state branch**

Find lines 34–48 (the `if (!round)` block). Replace the entire block with:

```tsx
  if (!round) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {/* CTA area */}
        <div style={{ padding: '40px 36px 0' }}>
          <DashboardTour />

          <div style={{ marginBottom: 36 }}>
            <p
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.3)',
                marginBottom: 12,
              }}
            >
              Your manager scorecard
            </p>
            <h1
              style={{
                fontSize: 26,
                fontWeight: 800,
                lineHeight: 1.2,
                letterSpacing: '-0.02em',
                color: '#fff',
                marginBottom: 12,
              }}
            >
              You&apos;re one short reflection away from{' '}
              <em style={{ color: '#f59e0b', fontStyle: 'normal' }}>real clarity.</em>
            </h1>
            <p
              style={{
                fontSize: 14,
                color: 'rgba(255,255,255,0.5)',
                lineHeight: 1.7,
                maxWidth: 480,
                marginBottom: 24,
              }}
            >
              Most managers guess at where they&apos;re strong and where they&apos;re not. Ten
              minutes of honest self-assessment across six pillars gives you a structured picture
              — and something concrete to bring to your next 1:1.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <Link
                id="dashboard-cta-btn"
                href="/scorecard"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  background: '#f59e0b',
                  color: '#1a2a3a',
                  fontWeight: 700,
                  fontSize: 13,
                  padding: '12px 22px',
                  borderRadius: 10,
                  textDecoration: 'none',
                }}
              >
                Start your scorecard →
              </Link>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>
                ~10 minutes · no right answers
              </span>
            </div>
          </div>
        </div>

        {/* Benefit strips — full width of main panel */}
        <div style={{ padding: '0 36px 40px' }}>
          <p
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.2)',
              marginBottom: 14,
            }}
          >
            What you&apos;ll unlock
          </p>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 12,
            }}
          >
            {BENEFIT_STRIPS.map(strip => (
              <div
                key={strip.title}
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: 10,
                  padding: 16,
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    background: 'rgba(245,158,11,0.1)',
                    borderRadius: 8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 12,
                  }}
                >
                  <strip.Icon size={16} color="#f59e0b" strokeWidth={1.5} />
                </div>
                <p
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: 'rgba(255,255,255,0.85)',
                    marginBottom: 5,
                    lineHeight: 1.3,
                  }}
                >
                  {strip.title}
                </p>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)', lineHeight: 1.55 }}>
                  {strip.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }
```

- [ ] **Step 4: Run the full test suite**

```bash
npx vitest run
```

Expected: all tests pass. The dashboard page is a server component — no new unit tests are written for the JSX change (the testable logic is in `DashboardTour`, already covered in Task 3).

- [ ] **Step 5: Commit**

```bash
git add app/\(app\)/dashboard/page.tsx
git commit -m "feat: redesign dashboard empty state with tour trigger and benefit strips"
```

---

### Task 5: Add driver.js popover dark-theme CSS overrides

**Files:**
- Modify: `app/globals.css`

driver.js ships its own CSS. These overrides ensure the popover matches the dark UI instead of showing driver.js's default light theme.

- [ ] **Step 1: Append overrides to app/globals.css**

Add the following block at the end of `app/globals.css`:

```css
/* ── driver.js spotlight tour — dark theme ────────────────────────────────── */

.bm-tour-popover {
  background: #1e293b !important;
  border: 1px solid rgba(255, 255, 255, 0.12) !important;
  border-radius: 12px !important;
  padding: 20px !important;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5) !important;
  color: #fff !important;
}

.bm-tour-popover .driver-popover-title {
  font-size: 15px !important;
  font-weight: 700 !important;
  color: #fff !important;
  margin-bottom: 8px;
}

.bm-tour-popover .driver-popover-description {
  font-size: 12px !important;
  color: rgba(255, 255, 255, 0.55) !important;
  line-height: 1.65 !important;
}

.bm-tour-popover .driver-popover-progress-text {
  font-size: 10px !important;
  font-weight: 700 !important;
  color: #f59e0b !important;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.bm-tour-popover button.driver-popover-next-btn {
  background: #f59e0b !important;
  color: #1a2a3a !important;
  border: none !important;
  font-size: 12px !important;
  font-weight: 600 !important;
  border-radius: 6px !important;
  padding: 6px 16px !important;
  cursor: pointer;
}

.bm-tour-popover button.driver-popover-prev-btn,
.bm-tour-popover button.driver-popover-close-btn {
  background: transparent !important;
  color: rgba(255, 255, 255, 0.35) !important;
  border: none !important;
  font-size: 11px !important;
  cursor: pointer;
  text-shadow: none !important;
  box-shadow: none !important;
}
```

- [ ] **Step 2: Run the full test suite one final time**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add app/globals.css
git commit -m "feat: add dark-theme CSS overrides for driver.js tour popover"
```
