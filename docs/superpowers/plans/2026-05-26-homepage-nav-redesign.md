# Home Page & Nav Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refocus the home page and public nav around the tool CTA — rename nav items, reorder so the tool leads, apply an amber pill to it, replace the static quote with a rotating set from management thinkers, and drop the Blog card from the feature grid.

**Architecture:** Five targeted changes across three layers — config (nav data), two existing UI components (`nav.tsx`, `feature-grid.tsx`), one new client component (`rotating-quote.tsx`), and the home page entry point (`app/page.tsx`). No new routes, no schema changes.

**Tech Stack:** Next.js 15 App Router, React 18, Tailwind CSS v4, Vitest + Testing Library

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `config/site.ts` | Modify | Nav labels, order, `cta` flag |
| `components/layout/nav.tsx` | Modify | Amber pill style for CTA nav item |
| `components/sections/feature-grid.tsx` | Modify | Add optional `primary` prop per card |
| `components/sections/rotating-quote.tsx` | Create | Shuffled, auto-rotating quote display |
| `app/page.tsx` | Modify | Two-card grid (Tool primary, Guide); RotatingQuote |
| `__tests__/components/sections/feature-grid.test.tsx` | Create | Primary card styling test |
| `__tests__/components/sections/rotating-quote.test.tsx` | Create | Render + rotation behaviour tests |

---

### Task 1: Update nav config

**Files:**
- Modify: `config/site.ts`

- [ ] **Step 1: Update the nav array**

Replace the existing `nav` array. Add `cta: true` to the tool entry and move it to position 0. Rename labels. Keep everything else identical.

```typescript
// config/site.ts — full file replacement
export const siteConfig = {
  title: 'Brilliant Managers',
  description: 'A field guide to management — for people doing it on purpose.',
  url: 'https://brilliantmanagers.info',
  gaId: 'G-1BSMVXG0PJ',
  githubUrl: 'https://github.com/terrybrown/brilliantmanagers.info',
  nav: [
    { label: 'Try the Scorecard', href: '/the-tool', cta: true },
    { label: 'Read the Guide', href: '/the-guide' },
    { label: 'Blog', href: '/blog' },
    { label: 'Resources', href: '/resources' },
    { label: 'FAQ', href: '/the-guide/faq' },
  ],
  social: {
    linkedin: 'https://www.linkedin.com/in/terrybrownuk/',
    github: 'https://github.com/terrybrown/',
  },
} as const
```

- [ ] **Step 2: Run tests — confirm green**

```bash
npm test
```

Expected: all existing tests pass.

- [ ] **Step 3: Commit**

```bash
git add config/site.ts
git commit -m "feat: rename nav items and add cta flag to tool entry"
```

---

### Task 2: Style the CTA nav link

**Files:**
- Modify: `components/layout/nav.tsx`

- [ ] **Step 1: Read the current file**

Open `components/layout/nav.tsx`. The `NavLink` component renders every nav item identically. We need to detect the `cta` flag on an item and apply amber pill styling.

Because `siteConfig` uses `as const`, the inferred type of each nav item differs — the tool item has `cta: true` while the others don't have `cta` at all. Use the `'cta' in item` type guard to avoid TypeScript errors.

- [ ] **Step 2: Update `NavLink` to apply amber pill when `item.cta` is set**

In `components/layout/nav.tsx`, find the `NavLink` function. After the existing `const isActive = ...` and `const Icon = ...` lines, add:

```typescript
const isCta = 'cta' in item && item.cta
```

Then update the `<Link>` element to conditionally apply the pill style. Replace the existing `<Link ... className={className} style={...}>` with:

```tsx
<Link
  href={href}
  onClick={onClick}
  className={isCta ? `${className} rounded` : className}
  style={
    isCta
      ? {
          background: 'rgba(245,158,11,0.12)',
          border: '1px solid rgba(245,158,11,0.25)',
          color: '#f59e0b',
          padding: '4px 10px',
          fontWeight: 600,
        }
      : { color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-muted)', ...extraStyle }
  }
>
  {Icon && (
    <Icon size={iconSize} strokeWidth={1.75} style={{ color: 'var(--color-accent)', flexShrink: 0 }} />
  )}
  {item.label}
</Link>
```

- [ ] **Step 3: Run tests — confirm green**

```bash
npm test
```

Expected: all existing tests pass.

- [ ] **Step 4: Commit**

```bash
git add components/layout/nav.tsx
git commit -m "feat: amber pill CTA style for Try the Scorecard nav link"
```

---

### Task 3: Add `primary` prop to FeatureGrid (TDD)

**Files:**
- Modify: `components/sections/feature-grid.tsx`
- Create: `__tests__/components/sections/feature-grid.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `__tests__/components/sections/feature-grid.test.tsx`:

```typescript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FeatureGrid } from '@/components/sections/feature-grid'

const baseCard = {
  icon: null,
  title: 'The Tool',
  body: 'Know where you are.',
  href: '/the-tool',
  linkLabel: 'Open the scorecard',
}

describe('FeatureGrid', () => {
  it('renders card title, body, and link', () => {
    render(<FeatureGrid cards={[baseCard]} />)
    expect(screen.getByText('The Tool')).toBeInTheDocument()
    expect(screen.getByText('Know where you are.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /open the scorecard/i })).toHaveAttribute('href', '/the-tool')
  })

  it('applies default (non-primary) background to a standard card', () => {
    const { container } = render(<FeatureGrid cards={[baseCard]} />)
    const card = container.querySelector('.rounded-xl')
    expect(card).toHaveStyle({ background: 'rgba(254,252,247,0.05)' })
  })

  it('applies amber background and border to a primary card', () => {
    const { container } = render(
      <FeatureGrid cards={[{ ...baseCard, primary: true }]} />
    )
    const card = container.querySelector('.rounded-xl')
    expect(card).toHaveStyle({ background: 'rgba(245,158,11,0.07)' })
    expect(card).toHaveStyle({ border: '1px solid rgba(245,158,11,0.30)' })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- __tests__/components/sections/feature-grid.test.tsx
```

Expected: the "applies amber background" test fails because `primary` prop doesn't exist yet.

- [ ] **Step 3: Add `primary` prop to `FeatureGrid`**

In `components/sections/feature-grid.tsx`, update the `FeatureCard` interface and the card rendering:

```typescript
import Link from 'next/link'
import { type ReactNode } from 'react'

interface FeatureCard {
  icon: ReactNode
  title: string
  body: string
  href: string
  linkLabel: string
  primary?: boolean
}

interface FeatureGridProps {
  cards: FeatureCard[]
}

export function FeatureGrid({ cards }: FeatureGridProps) {
  return (
    <section className="px-6 pb-20" style={{ maxWidth: 'var(--container-width)', margin: '0 auto' }}>
      <div className="grid gap-5 sm:grid-cols-2">
        {cards.map((card) => (
          <div
            key={card.href}
            className="flex flex-col rounded-xl p-6"
            style={
              card.primary
                ? {
                    background: 'rgba(245,158,11,0.07)',
                    border: '1px solid rgba(245,158,11,0.30)',
                  }
                : {
                    background: 'rgba(254,252,247,0.05)',
                    border: '1px solid rgba(254,252,247,0.10)',
                  }
            }
          >
            <div className="mb-2 flex items-center gap-2">
              {card.icon}
              <h2
                className="text-xl font-bold"
                style={{ fontFamily: 'var(--font-display)', color: '#fefcf7' }}
              >
                {card.title}
              </h2>
            </div>
            <p
              className="mb-4 flex-1 text-sm leading-relaxed"
              style={{ color: 'rgba(254,252,247,0.70)' }}
            >
              {card.body}
            </p>
            <div className="flex justify-end">
              <Link
                href={card.href}
                className="text-xs font-semibold"
                style={{ color: '#f59e0b' }}
              >
                {card.linkLabel} →
              </Link>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
```

Note: grid changed from `sm:grid-cols-3` to `sm:grid-cols-2` because we now have two cards.

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- __tests__/components/sections/feature-grid.test.tsx
```

Expected: all 3 tests pass.

- [ ] **Step 5: Run full suite — confirm no regressions**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add components/sections/feature-grid.tsx __tests__/components/sections/feature-grid.test.tsx
git commit -m "feat: add primary card variant to FeatureGrid with amber styling"
```

---

### Task 4: Create RotatingQuote component (TDD)

**Files:**
- Create: `components/sections/rotating-quote.tsx`
- Create: `__tests__/components/sections/rotating-quote.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/components/sections/rotating-quote.test.tsx`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { RotatingQuote } from '@/components/sections/rotating-quote'

// Pin Math.random so the Fisher-Yates shuffle always produces
// the original array order — makes assertions deterministic.
beforeEach(() => {
  vi.useFakeTimers()
  vi.spyOn(Math, 'random').mockReturnValue(0)
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('RotatingQuote', () => {
  it('renders a blockquote and an attribution on first paint', () => {
    const { container } = render(<RotatingQuote />)
    // blockquote has no implicit ARIA role — query by element name
    expect(container.querySelector('blockquote')).toBeInTheDocument()
    // Attribution line always starts with an em dash
    expect(screen.getByText(/^—\s/)).toBeInTheDocument()
  })

  it('shows the first quote from the list when Math.random is pinned to 0', () => {
    render(<RotatingQuote />)
    expect(screen.getByText(/Management is doing things right/i)).toBeInTheDocument()
    expect(screen.getByText(/— Peter Drucker/)).toBeInTheDocument()
  })

  it('advances to the second quote after 10 seconds + fade delay', async () => {
    render(<RotatingQuote />)

    // Confirm first quote is shown
    expect(screen.getByText(/Management is doing things right/i)).toBeInTheDocument()

    // Fire the 10-second interval
    act(() => { vi.advanceTimersByTime(10000) })
    // Fire the 400ms fade-in delay
    act(() => { vi.advanceTimersByTime(400) })

    // Second quote in the list is also Peter Drucker
    expect(screen.getByText(/most important thing in communication/i)).toBeInTheDocument()
    expect(screen.getByText(/— Peter Drucker/)).toBeInTheDocument()
  })

  it('wraps back to the first quote after all 15 quotes have shown', async () => {
    render(<RotatingQuote />)

    // Advance through all 15 quotes (14 transitions + 1 back to start)
    for (let i = 0; i < 15; i++) {
      act(() => { vi.advanceTimersByTime(10000) })
      act(() => { vi.advanceTimersByTime(400) })
    }

    expect(screen.getByText(/Management is doing things right/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- __tests__/components/sections/rotating-quote.test.tsx
```

Expected: all tests fail because `rotating-quote.tsx` doesn't exist yet.

- [ ] **Step 3: Create `RotatingQuote` component**

Create `components/sections/rotating-quote.tsx`:

```typescript
'use client'

import { useState, useEffect } from 'react'

const QUOTES = [
  { quote: "Management is doing things right; leadership is doing the right things.", attribution: "Peter Drucker" },
  { quote: "The most important thing in communication is hearing what isn't said.", attribution: "Peter Drucker" },
  { quote: "Your output is the output of your team.", attribution: "Andy Grove" },
  { quote: "The manager asks how and when; the leader asks what and why.", attribution: "Warren Bennis" },
  { quote: "Management is, above all, a practice where art, science, and craft meet.", attribution: "Henry Mintzberg" },
  { quote: "Leadership is not about being in charge. It is about taking care of those in your charge.", attribution: "Simon Sinek" },
  { quote: "Your title makes you a manager. Your people make you a leader.", attribution: "Bill Campbell" },
  { quote: "If you give a good idea to a mediocre team, they will screw it up. If you give a mediocre idea to a brilliant team, they will either fix it or throw it away and come up with something better.", attribution: "Ed Catmull" },
  { quote: "A great workplace is stunning colleagues.", attribution: "Reed Hastings" },
  { quote: "Radical Candor is about caring personally while challenging directly.", attribution: "Kim Scott" },
  { quote: "Teamwork begins by building trust. And the only way to do that is to overcome our need for invulnerability.", attribution: "Patrick Lencioni" },
  { quote: "The best leaders amplify the intelligence around them.", attribution: "Liz Wiseman" },
  { quote: "Psychological safety is not about being nice. It's about giving candid feedback, openly admitting mistakes, and learning from each other.", attribution: "Amy Edmondson" },
  { quote: "Great managers know and value the unique abilities and even the eccentricities of their employees.", attribution: "Marcus Buckingham" },
  { quote: "A leader is one who knows the way, goes the way, and shows the way.", attribution: "John C. Maxwell" },
]

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function RotatingQuote() {
  const [quotes] = useState(() => shuffle(QUOTES))
  const [index, setIndex] = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const timer = setInterval(() => {
      setVisible(false)
      const fadeIn = setTimeout(() => {
        setIndex(i => (i + 1) % quotes.length)
        setVisible(true)
      }, 400)
      return () => clearTimeout(fadeIn)
    }, 10000)
    return () => clearInterval(timer)
  }, [quotes.length])

  const current = quotes[index]

  return (
    <section
      className="border-t px-6 pt-8 pb-16"
      style={{ borderColor: 'rgba(254,252,247,0.08)' }}
    >
      <div
        style={{
          maxWidth: 'var(--container-width)',
          margin: '0 auto',
          textAlign: 'center',
          transition: 'opacity 0.4s ease',
          opacity: visible ? 1 : 0,
        }}
      >
        <blockquote
          className="italic leading-snug"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(1.1rem, 2.5vw, 1.4rem)',
            color: 'rgba(254,252,247,0.80)',
          }}
        >
          &ldquo;{current.quote}&rdquo;
        </blockquote>
        <cite
          className="mt-4 block text-xs not-italic uppercase tracking-widest"
          style={{ color: 'rgba(254,252,247,0.35)' }}
        >
          — {current.attribution}
        </cite>
      </div>
    </section>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- __tests__/components/sections/rotating-quote.test.tsx
```

Expected: all 4 tests pass.

- [ ] **Step 5: Run full suite — confirm no regressions**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add components/sections/rotating-quote.tsx __tests__/components/sections/rotating-quote.test.tsx
git commit -m "feat: RotatingQuote component — shuffled 15 management quotes, 10s rotation"
```

---

### Task 5: Wire up the home page

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Rewrite `app/page.tsx`**

Replace the entire file:

```typescript
import { Hero } from '@/components/sections/hero'
import { FeatureGrid } from '@/components/sections/feature-grid'
import { RotatingQuote } from '@/components/sections/rotating-quote'
import { GuideBookIcon, GaugeIcon } from '@/components/icons/guide-icons'

export const metadata = {
  title: 'Brilliant Managers — A field guide to management',
}

export default function HomePage() {
  return (
    <div style={{ background: '#1a3a5c' }}>
      <Hero
        eyebrow="A field guide to management"
        headline={
          <>
            Most of us became managers{' '}
            <em style={{ color: '#f59e0b' }}>by accident.</em>
          </>
        }
        body="A framework — not a manual. It won't tell you what to do. It'll help you see where you are."
      />
      <FeatureGrid
        cards={[
          {
            icon: <GaugeIcon size={22} />,
            title: 'The Tool',
            body: 'Know where you actually are — not where you hope you are. Then do something about it.',
            href: '/the-tool',
            linkLabel: 'Open the scorecard',
            primary: true,
          },
          {
            icon: <GuideBookIcon size={22} />,
            title: 'The Guide',
            body: 'Five pillars. Dozens of dimensions. All the things nobody told you when you got the job.',
            href: '/the-guide',
            linkLabel: 'Start reading',
          },
        ]}
      />
      <RotatingQuote />
    </div>
  )
}
```

- [ ] **Step 2: Verify `BlogIcon` is not imported elsewhere in the home page**

The `BlogIcon` import is removed. Confirm no TypeScript errors:

```bash
npm run build 2>&1 | head -40
```

Expected: build completes without errors. If it errors on `BlogIcon`, check `components/icons/guide-icons.tsx` — the export may still exist there (that's fine, we just stopped importing it).

- [ ] **Step 3: Run full test suite**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx
git commit -m "feat: home page — two-card grid (Tool primary, Guide), rotating quote section"
```

---

## Verification Checklist

After all tasks are complete, run:

```bash
npm test && npm run build && npm run lint
```

Expected: zero test failures, clean build, no lint errors.

Then manually verify in the browser (`npm run dev`):
- [ ] Nav shows: Try the Scorecard (amber pill, first) · Read the Guide · Blog · Resources · FAQ
- [ ] Clicking "Try the Scorecard" when logged out goes to `/the-tool`; when logged in goes to `/dashboard`
- [ ] Home page shows two cards: Tool (amber tint) then Guide; no Blog card
- [ ] Quote section is centre-aligned, font size matches the old pull quote
- [ ] Quote rotates after 10 seconds with a fade transition
- [ ] Each page refresh shows a different starting quote (randomised)
