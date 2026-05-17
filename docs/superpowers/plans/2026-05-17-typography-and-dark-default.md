# Typography & Dark Default Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Fraunces with Bricolage Grotesque as the sitewide display font, and change the default theme from light to dark.

**Architecture:** Four files change. The font swap is a CSS token change — updating `--font-display` in `globals.css` and the import in `layout.tsx` propagates automatically to every element that already uses `var(--font-display)` (nav logo, all `.prose` headings). Two app-shell components need `fontFamily: 'var(--font-display)'` added to their inline styles (they currently omit it and fall back to Inter). The `ThemeProvider` in `layout.tsx` gets `defaultTheme="dark"` and `enableSystem={false}`; the `ThemeToggle` already exists in the public nav and needs no changes.

**Tech Stack:** Next.js 14 App Router, `next/font/google` (`Bricolage_Grotesque`), `next-themes`, Vitest + React Testing Library

---

## File map

| File | Change |
|------|--------|
| `app/layout.tsx` | Swap `Fraunces` → `Bricolage_Grotesque`; update ThemeProvider |
| `app/globals.css` | `--font-display: var(--font-bricolage), sans-serif` |
| `components/app/Topbar.tsx` | Add `fontFamily: 'var(--font-display)'` to title span |
| `app/(app)/dashboard/page.tsx` | Add `fontFamily: 'var(--font-display)'` to empty-state `<h1>` |
| `__tests__/components/app/Topbar.test.tsx` | New — font variable assertion |
| `__tests__/app/dashboard/page.test.tsx` | New — empty-state h1 font variable assertion |

---

### Task 1: Load Bricolage Grotesque and update the CSS display-font token

**Files:**
- Modify: `app/layout.tsx`
- Modify: `app/globals.css`

No meaningful unit test exists for font loading or CSS custom properties in jsdom. Verified in the browser (Network tab).

- [ ] **Step 1: Run the existing test suite to confirm it is green before touching anything**

```bash
npx vitest run
```

Expected: all tests pass. Fix any pre-existing failures before continuing.

- [ ] **Step 2: Update `app/layout.tsx` — swap the font import and body className**

The full updated top section of the file (imports through the two font objects):

```tsx
import type { Metadata } from 'next'
import { Bricolage_Grotesque, Inter } from 'next/font/google'
import Script from 'next/script'
import { ThemeProvider } from 'next-themes'
import { Nav } from '@/components/layout/nav'
import { Footer } from '@/components/layout/footer'
import { siteConfig } from '@/config/site'
import { createClient } from '@/lib/supabase/server'
import './globals.css'

const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  axes: ['opsz'],
  variable: '--font-bricolage',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})
```

Update the `<body>` className (the ThemeProvider line is unchanged for now — that's Task 4):

```tsx
<body className={`${bricolage.variable} ${inter.variable}`}>
```

- [ ] **Step 3: Update `app/globals.css` — change the `--font-display` token**

Inside the `@theme` block, change:

```css
--font-display: var(--font-fraunces), serif;
```

to:

```css
--font-display: var(--font-bricolage), sans-serif;
```

- [ ] **Step 4: Verify in the dev server**

```bash
npm run dev
```

Open http://localhost:3000 in a browser. Check:
- DevTools → Network → Fonts: a request for Bricolage Grotesque appears; **no request for Fraunces**
- The nav logo ("Brilliant Managers") renders in Bricolage Grotesque (not Inter)
- Any `.prose` headings on the public site (e.g. `/the-guide`) render in Bricolage Grotesque

- [ ] **Step 5: Run the test suite to confirm no regressions**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add app/layout.tsx app/globals.css
git commit -m "feat: load Bricolage Grotesque, replace Fraunces as display font token"
```

---

### Task 2: Apply display font to the Topbar page title

**Files:**
- Modify: `components/app/Topbar.tsx`
- Create: `__tests__/components/app/Topbar.test.tsx`

The Topbar title span has no `fontFamily` in its inline style, so it falls back to Inter. This task adds `fontFamily: 'var(--font-display)'`.

- [ ] **Step 1: Write the failing test**

Create `__tests__/components/app/Topbar.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Topbar } from '@/components/app/Topbar'

vi.mock('next/navigation', () => ({ usePathname: () => '/dashboard' }))

const user = { displayName: 'Terry Brown', email: 'terry@test.com', initials: 'TB' }

describe('Topbar', () => {
  it('renders the page title', () => {
    render(<Topbar user={user} showBeta={false} />)
    expect(screen.getByText('Dashboard')).toBeTruthy()
  })

  it('page title uses the display font CSS variable', () => {
    render(<Topbar user={user} showBeta={false} />)
    const title = screen.getByText('Dashboard')
    expect(title.style.fontFamily).toBe('var(--font-display)')
  })
})
```

- [ ] **Step 2: Run the test to confirm the font assertion fails**

```bash
npx vitest run __tests__/components/app/Topbar.test.tsx
```

Expected: first test passes, second FAILS — `expected '' to be 'var(--font-display)'`

- [ ] **Step 3: Update `components/app/Topbar.tsx` — add `fontFamily` to the title span**

The title `<span>` currently (around line 45):

```tsx
<span style={{ fontWeight: 600, fontSize: 15, color: '#f8fafc', flex: 1 }}>{title}</span>
```

Replace with:

```tsx
<span style={{ fontWeight: 600, fontSize: 15, color: '#f8fafc', flex: 1, fontFamily: 'var(--font-display)' }}>
  {title}
</span>
```

- [ ] **Step 4: Run the test to confirm both assertions pass**

```bash
npx vitest run __tests__/components/app/Topbar.test.tsx
```

Expected: both tests PASS.

- [ ] **Step 5: Run the full suite**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add __tests__/components/app/Topbar.test.tsx components/app/Topbar.tsx
git commit -m "feat: apply display font to topbar page title"
```

---

### Task 3: Apply display font to the dashboard empty-state heading

**Files:**
- Modify: `app/(app)/dashboard/page.tsx`
- Create: `__tests__/app/dashboard/page.test.tsx`

The `<h1>` in the empty state (shown when no scorecard round exists) has no `fontFamily` declaration, so it renders in Inter. This task adds `fontFamily: 'var(--font-display)'`.

`DashboardPage` is an async Server Component. The test awaits it and renders the returned JSX — the same approach used for other async components in the project. All async dependencies (Supabase, DB functions) are mocked.

- [ ] **Step 1: Write the failing test**

Create `__tests__/app/dashboard/page.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import DashboardPage from '@/app/(app)/dashboard/page'

// Supabase server client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      }),
    },
  }),
}))

// DB functions — null round triggers the empty state branch
vi.mock('@/lib/db/rounds', () => ({
  getLatestCompleteRound: vi.fn().mockResolvedValue(null),
  getPreviousCompleteRound: vi.fn().mockResolvedValue(null),
  getInProgressRound: vi.fn().mockResolvedValue(null),
}))
vi.mock('@/lib/db/scores', () => ({
  getScoresForRound: vi.fn().mockResolvedValue([]),
}))
vi.mock('@/lib/db/manager-scores', () => ({
  getManagerScoresForDirectReport: vi.fn().mockResolvedValue([]),
}))
vi.mock('@/lib/db/development-plans', () => ({
  getPlansForUser: vi.fn().mockResolvedValue([]),
}))
vi.mock('@/lib/db/scheduled-rounds', () => ({
  getScheduledRound: vi.fn().mockResolvedValue(null),
}))
vi.mock('next/navigation', () => ({ redirect: vi.fn() }))

// DashboardTour (imported by the page) uses driver.js
vi.mock('driver.js', () => ({
  driver: vi.fn(() => ({ drive: vi.fn(), destroy: vi.fn() })),
}))
vi.mock('driver.js/dist/driver.css', () => ({}))

describe('DashboardPage — empty state', () => {
  it('renders the headline', async () => {
    render(await DashboardPage())
    expect(screen.getByRole('heading', { level: 1 })).toBeTruthy()
  })

  it('empty-state h1 uses the display font CSS variable', async () => {
    render(await DashboardPage())
    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading.style.fontFamily).toBe('var(--font-display)')
  })
})
```

- [ ] **Step 2: Run the test to confirm the font assertion fails**

```bash
npx vitest run __tests__/app/dashboard/page.test.tsx
```

Expected: first test passes, second FAILS — `expected '' to be 'var(--font-display)'`

- [ ] **Step 3: Update `app/(app)/dashboard/page.tsx` — add `fontFamily` to the empty-state `<h1>`**

Find the `<h1>` in the `if (!round)` branch (around line 82). It currently reads:

```tsx
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
```

Replace with:

```tsx
<h1
  style={{
    fontSize: 26,
    fontWeight: 800,
    lineHeight: 1.2,
    letterSpacing: '-0.02em',
    color: '#fff',
    marginBottom: 12,
    fontFamily: 'var(--font-display)',
  }}
>
```

- [ ] **Step 4: Run the test to confirm both assertions pass**

```bash
npx vitest run __tests__/app/dashboard/page.test.tsx
```

Expected: both tests PASS.

- [ ] **Step 5: Run the full suite**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add __tests__/app/dashboard/page.test.tsx "app/(app)/dashboard/page.tsx"
git commit -m "feat: apply display font to dashboard empty-state heading"
```

---

### Task 4: Set dark mode as the site default

**Files:**
- Modify: `app/layout.tsx`

No unit test is practical for a ThemeProvider prop change. Verified in the browser with a clean session (no `localStorage`).

- [ ] **Step 1: Update `app/layout.tsx` — change the ThemeProvider props**

Find:

```tsx
<ThemeProvider attribute="class" defaultTheme="light" enableSystem>
```

Replace with:

```tsx
<ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
```

`enableSystem={false}` prevents the user's OS preference from overriding the chosen theme — the ThemeToggle in the nav is the sole override mechanism.

- [ ] **Step 2: Verify in the browser**

```bash
npm run dev
```

1. Open http://localhost:3000 in an **incognito window** (guarantees no stored `localStorage` preference)
2. Confirm the page loads with a dark background (navy/slate, not the cream `#fefcf7`)
3. Navigate to a page that shows the ThemeToggle (e.g. `/the-guide` — the toggle is hidden on `/` and `/the-tool` by design)
4. Click the ☀️ button — confirm the page switches to light
5. Reload — confirm the light preference persists (stored in `localStorage`)
6. Click 🌙 — confirm it switches back to dark

- [ ] **Step 3: Run the full suite**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add app/layout.tsx
git commit -m "feat: default theme to dark, disable system preference override"
```
