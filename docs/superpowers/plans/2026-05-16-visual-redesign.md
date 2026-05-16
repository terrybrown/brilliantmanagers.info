# Visual Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate brilliantmanagers.info from Gatsby 2 to Next.js 15 with a full editorial-bold redesign, Tailwind v4 design system, shadcn/ui components, light/dark theming, and MDX-powered content.

**Architecture:** Design-system-first big-bang migration on a feature branch. Phase 1 builds the complete foundation (tokens, layout components, shadcn primitives) before any page is touched. Phase 2 builds pages in impact order (Homepage → Tool → Guide → Blog → Resources → 404). Phase 3 migrates and rewrites content. Phase 4 cuts over on Netlify.

**Tech Stack:** Next.js 15 App Router · TypeScript · Tailwind CSS v4 · shadcn/ui · next-themes · next-mdx-remote · Fraunces + Inter (next/font) · Vitest + @testing-library/react · Netlify (@netlify/plugin-nextjs)

---

## File map

Files created or significantly modified by this plan. Each task references paths from here.

```
# Config
config/site.ts                        siteConfig: nav, social, GA ID, GitHub URL
config/scoring.ts                     ScoringLevel type + level descriptions/colours

# Lib
lib/mdx.ts                            read MDX from content/ dir (next-mdx-remote/rsc)
lib/guide.ts                          guide section order + prev/next helpers

# Content (repo root, NOT inside app/)
content/guide/index.mdx               Guide landing copy
content/guide/measurement.mdx
content/guide/self.mdx
content/guide/team.mdx
content/guide/strategy.mdx
content/guide/communications.mdx
content/guide/domain-expertise.mdx
content/guide/faq.mdx
content/blog/hello-world.mdx          Ported from src/pages/blog/hello-world.md

# App shell
app/layout.tsx                        Root layout: ThemeProvider, fonts, analytics, metadata
app/not-found.tsx                     404 — always dark, personality moment
app/globals.css                       Tailwind v4 @import + @theme tokens + @variant dark

# Pages
app/page.tsx                          Homepage — dark wrapper div.dark
app/the-tool/page.tsx                 Tool landing — dark wrapper div.dark
app/the-guide/page.tsx                Guide index — light, toggle visible
app/the-guide/[...slug]/page.tsx      Guide chapter — light, toggle visible
app/blog/page.tsx                     Blog index — light, toggle visible
app/blog/[slug]/page.tsx              Blog post — light, toggle visible
app/resources/page.tsx                Resources — light, toggle visible

# Layout components
components/layout/nav.tsx             Nav: conditional ThemeToggle, mobile Sheet
components/layout/footer.tsx          Dark footer
components/layout/theme-toggle.tsx    Client: 🌙/☀️ pill toggle

# Section components (homepage)
components/sections/hero.tsx          Eyebrow + amber rule + display H1 + body + CTAs
components/sections/feature-grid.tsx  3-column dark card grid
components/sections/pull-quote.tsx    Fraunces italic editorial quote

# Guide components
components/guide/chapter-nav.tsx      Sidebar chapter list with active state
components/guide/chapter-toc.tsx      Sticky right-column TOC
components/guide/callout.tsx          MDX <Callout> — amber left-border tip block
components/guide/pull-quote.tsx       MDX <PullQuote> — Fraunces italic extract
components/guide/scoring-badge.tsx    MDX <ScoringBadge level="Proficient" />
components/guide/mdx-components.tsx   Re-exports all guide MDX components as a map

# Tool components
components/tool/scorecard-preview.tsx Dark preview card with named-level rows

# shadcn primitives (copied in by CLI — list only, not manually created)
components/ui/button.tsx
components/ui/card.tsx
components/ui/badge.tsx
components/ui/separator.tsx
components/ui/tooltip.tsx
components/ui/sheet.tsx
components/ui/accordion.tsx
components/ui/navigation-menu.tsx

# Config files
next.config.ts
postcss.config.mjs
tailwind.config.ts                    NOT needed — Tailwind v4 is CSS-first
vitest.config.ts
vitest.setup.ts
netlify.toml                          Updated for Next.js
```

---

## Phase 1 — Foundation

### Task 1: Create feature branch and initialise Next.js 15

**Files:**
- Create: `next.config.ts`, `tsconfig.json`, `package.json`, `postcss.config.mjs`, `app/layout.tsx` (stub), `app/globals.css` (stub)

- [ ] **Step 1: Create feature branch**

```bash
git checkout -b redesign/nextjs-migration
```

- [ ] **Step 2: Initialise Next.js in the repo root**

When prompted "would you like to continue?" answer `y`. Use `--no-tailwind` because we install Tailwind v4 manually in Task 2.

```bash
npx create-next-app@latest . \
  --typescript \
  --app \
  --no-src-dir \
  --no-tailwind \
  --eslint \
  --import-alias "@/*"
```

Expected: Next.js project files created. `package.json` now has `next`, `react`, `react-dom`, `typescript`.

- [ ] **Step 3: Remove Gatsby files**

```bash
rm -rf src/ plugins/ gatsby-browser.js gatsby-config.js gatsby-node.js gatsby-ssr.js site-metadata.json stackbit.yaml
```

- [ ] **Step 4: Move static assets**

```bash
cp -r static/. public/
rm -rf static/
```

- [ ] **Step 5: Create content directories**

```bash
mkdir -p content/guide content/blog
```

- [ ] **Step 6: Verify the dev server starts**

```bash
npm run dev
```

Expected: `http://localhost:3000` loads the default Next.js page. No Gatsby references in output.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: initialise Next.js 15 App Router, remove Gatsby"
```

---

### Task 2: Install and configure Tailwind v4 with design tokens

**Files:**
- Create: `postcss.config.mjs`
- Modify: `app/globals.css`

- [ ] **Step 1: Install Tailwind v4**

```bash
npm install tailwindcss@^4 @tailwindcss/postcss
```

- [ ] **Step 2: Write `postcss.config.mjs`**

```js
// postcss.config.mjs
export default {
  plugins: {
    '@tailwindcss/postcss': {},
  },
}
```

- [ ] **Step 3: Write `app/globals.css` with all design tokens**

```css
@import "tailwindcss";

/* Dark mode: applies when an ancestor has the .dark class (set by next-themes) */
@variant dark (&:is(.dark *));

@theme {
  /* ── Fonts ── */
  --font-display: "Fraunces Variable", serif;
  --font-body: "Inter", sans-serif;

  /* ── Colour tokens ── */
  /* Light mode (default) */
  --color-bg-base: #fefcf7;
  --color-bg-reading: #f9f8f4;
  --color-text-primary: #1c1917;
  --color-text-muted: #44403c;
  --color-accent: #d97706;
  --color-border: #e7e5e4;

  /* Dark mode overrides applied via .dark class */
  --color-bg-base-dark: #1a3a5c;
  --color-bg-reading-dark: #16202d;
  --color-text-primary-dark: #fefcf7;
  --color-text-muted-dark: rgba(254, 252, 247, 0.60);
  --color-accent-dark: #f59e0b;
  --color-border-dark: rgba(254, 252, 247, 0.12);

  /* ── Layout ── */
  --radius: 8px;
  --radius-lg: 16px;
  --container-width: 1080px;
  --prose-width: 680px;
  --section-gap: 96px;
}

/* Apply dark token values when .dark class is active */
.dark {
  --color-bg-base: #1a3a5c;
  --color-bg-reading: #16202d;
  --color-text-primary: #fefcf7;
  --color-text-muted: rgba(254, 252, 247, 0.60);
  --color-accent: #f59e0b;
  --color-border: rgba(254, 252, 247, 0.12);
}

/* ── Base styles ── */
body {
  background-color: var(--color-bg-base);
  color: var(--color-text-primary);
  font-family: var(--font-body);
  -webkit-font-smoothing: antialiased;
}

/* ── Amber rule utility ── */
.amber-rule {
  display: block;
  width: 40px;
  height: 2px;
  background-color: var(--color-accent);
  margin-bottom: 12px;
}

/* ── Prose overrides for MDX content ── */
.prose {
  max-width: var(--prose-width);
  font-size: 17px;
  line-height: 1.7;
  color: var(--color-text-muted);
}

.prose h1, .prose h2, .prose h3 {
  font-family: var(--font-display);
  color: var(--color-text-primary);
}

.prose a {
  color: var(--color-accent);
  text-underline-offset: 2px;
}
```

- [ ] **Step 4: Verify Tailwind loads**

```bash
npm run dev
```

Expected: no PostCSS errors. The page background should now be `#fefcf7` (warm cream).

- [ ] **Step 5: Commit**

```bash
git add app/globals.css postcss.config.mjs package.json package-lock.json
git commit -m "feat: add Tailwind v4 with design tokens"
```

---

### Task 3: Set up Fraunces and Inter fonts

**Files:**
- Modify: `app/layout.tsx`

- [ ] **Step 1: Install Fraunces from npm (Google Fonts variable font)**

```bash
npm install @fontsource-variable/fraunces @fontsource/inter
```

- [ ] **Step 2: Update `app/layout.tsx` to import fonts**

`next/font/google` handles Fraunces (variable) and Inter. Replace the stub layout:

```tsx
// app/layout.tsx
import type { Metadata } from 'next'
import { Fraunces, Inter } from 'next/font/google'
import './globals.css'

const fraunces = Fraunces({
  subsets: ['latin'],
  axes: ['opsz', 'SOFT', 'WONK'],
  variable: '--font-fraunces',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Brilliant Managers',
  description: 'A field guide to management — for people doing it on purpose.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${fraunces.variable} ${inter.variable}`}>
        {children}
      </body>
    </html>
  )
}
```

- [ ] **Step 3: Update globals.css to use the CSS variables set by next/font**

Replace the `@theme` font lines in `app/globals.css`:

```css
/* In @theme block, replace the font lines with: */
--font-display: var(--font-fraunces), serif;
--font-body: var(--font-inter), sans-serif;
```

- [ ] **Step 4: Add a quick smoke test in the stub page**

In `app/page.tsx`, temporarily add a Fraunces headline to confirm font loading:

```tsx
export default function Home() {
  return (
    <h1 style={{ fontFamily: 'var(--font-fraunces), serif', fontSize: '48px' }}>
      Most of us became managers by accident.
    </h1>
  )
}
```

- [ ] **Step 5: Run dev and verify Fraunces renders**

```bash
npm run dev
```

Expected: `http://localhost:3000` shows the headline in Fraunces serif (distinctive variable-weight letterforms). Not Inter, not Times.

- [ ] **Step 6: Commit**

```bash
git add app/layout.tsx app/globals.css package.json package-lock.json
git commit -m "feat: add Fraunces + Inter via next/font"
```

---

### Task 4: Set up Vitest test infrastructure

**Files:**
- Create: `vitest.config.ts`, `vitest.setup.ts`
- Modify: `package.json`

- [ ] **Step 1: Install Vitest and testing libraries**

```bash
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/dom @testing-library/jest-dom
```

- [ ] **Step 2: Create `vitest.config.ts`**

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
```

- [ ] **Step 3: Create `vitest.setup.ts`**

```ts
// vitest.setup.ts
import '@testing-library/jest-dom'
```

- [ ] **Step 4: Add test script to `package.json`**

In the `"scripts"` block, add:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 5: Write a smoke test to verify the setup works**

```ts
// __tests__/setup.test.ts
describe('test infrastructure', () => {
  it('works', () => {
    expect(1 + 1).toBe(2)
  })
})
```

- [ ] **Step 6: Run tests**

```bash
npm test
```

Expected output:
```
✓ __tests__/setup.test.ts (1)
  ✓ test infrastructure > works

Test Files  1 passed (1)
Tests  1 passed (1)
```

- [ ] **Step 7: Commit**

```bash
git add vitest.config.ts vitest.setup.ts __tests__/setup.test.ts package.json package-lock.json
git commit -m "feat: add Vitest + testing-library infrastructure"
```

---

### Task 5: Create `config/scoring.ts`

**Files:**
- Create: `config/scoring.ts`, `__tests__/config/scoring.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// __tests__/config/scoring.test.ts
import { SCORING_LEVELS, SCORING_LEVEL_DESCRIPTIONS, SCORING_LEVEL_COLORS } from '@/config/scoring'
import type { ScoringLevel } from '@/config/scoring'

describe('scoring config', () => {
  it('has exactly four levels in the correct order', () => {
    expect(SCORING_LEVELS).toEqual(['Developing', 'Practising', 'Proficient', 'Leading'])
  })

  it('has a description for every level', () => {
    SCORING_LEVELS.forEach((level) => {
      expect(SCORING_LEVEL_DESCRIPTIONS[level]).toBeTruthy()
      expect(SCORING_LEVEL_DESCRIPTIONS[level].length).toBeGreaterThan(20)
    })
  })

  it('has colour classes for every level', () => {
    SCORING_LEVELS.forEach((level) => {
      expect(SCORING_LEVEL_COLORS[level].bg).toBeTruthy()
      expect(SCORING_LEVEL_COLORS[level].text).toBeTruthy()
    })
  })

  it('ScoringLevel type covers all levels', () => {
    const level: ScoringLevel = 'Proficient'
    expect(SCORING_LEVELS).toContain(level)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- __tests__/config/scoring.test.ts
```

Expected: FAIL — `Cannot find module '@/config/scoring'`

- [ ] **Step 3: Create `config/scoring.ts`**

```ts
// config/scoring.ts
export const SCORING_LEVELS = [
  'Developing',
  'Practising',
  'Proficient',
  'Leading',
] as const

export type ScoringLevel = (typeof SCORING_LEVELS)[number]

export const SCORING_LEVEL_DESCRIPTIONS: Record<ScoringLevel, string> = {
  Developing:
    "You know this matters and you're actively working on it. The gap between knowing and doing is closing.",
  Practising:
    'You apply this with reasonable consistency. Not automatic yet, but deliberate.',
  Proficient:
    'This shows up reliably. The people around you notice and benefit from it.',
  Leading:
    "You're role-modelling this and actively helping others develop it too.",
}

export const SCORING_LEVEL_COLORS: Record<
  ScoringLevel,
  { bg: string; text: string }
> = {
  Developing: {
    bg: 'bg-blue-50 dark:bg-blue-950/40',
    text: 'text-blue-600 dark:text-blue-400',
  },
  Practising: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    text: 'text-emerald-600 dark:text-emerald-400',
  },
  Proficient: {
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    text: 'text-amber-600 dark:text-amber-400',
  },
  Leading: {
    bg: 'bg-amber-100 dark:bg-amber-900/40',
    text: 'text-amber-800 dark:text-amber-200',
  },
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- __tests__/config/scoring.test.ts
```

Expected: all 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add config/scoring.ts __tests__/config/scoring.test.ts
git commit -m "feat: add scoring level config (Developing/Practising/Proficient/Leading)"
```

---

### Task 6: Create `config/site.ts`

**Files:**
- Create: `config/site.ts`

- [ ] **Step 1: Create `config/site.ts`**

No test needed — this is a typed constant with no logic. TypeScript validates it at compile time.

```ts
// config/site.ts
export const siteConfig = {
  title: 'Brilliant Managers',
  description: 'A field guide to management — for people doing it on purpose.',
  url: 'https://brilliantmanagers.info',
  gaId: 'G-1BSMVXG0PJ',
  githubUrl: 'https://github.com/terrybrown/brilliantmanagers.info',
  nav: [
    { label: 'The Guide', href: '/the-guide' },
    { label: 'The Tool', href: '/the-tool' },
    { label: 'Blog', href: '/blog' },
    { label: 'Resources', href: '/resources' },
  ],
  social: {
    twitter: 'https://twitter.com/terry_brown',
    linkedin: 'https://www.linkedin.com/in/terrybrownuk/',
    github: 'https://github.com/terrybrown/',
  },
} as const
```

- [ ] **Step 2: Commit**

```bash
git add config/site.ts
git commit -m "feat: add site config (nav, social, GA ID)"
```

---

### Task 7: Install shadcn/ui and copy in base primitives

**Files:**
- Create: `components/ui/button.tsx`, `components/ui/card.tsx`, `components/ui/badge.tsx`, `components/ui/separator.tsx`, `components/ui/tooltip.tsx`, `components/ui/sheet.tsx`, `components/ui/accordion.tsx`, `components/ui/navigation-menu.tsx`, `lib/utils.ts`, `components.json`

- [ ] **Step 1: Initialise shadcn**

```bash
npx shadcn@latest init
```

When prompted:
- Style: **Default**
- Base color: **Stone** (closest to our warm cream/ink palette)
- CSS variables: **Yes**

This creates `components.json` and `lib/utils.ts` (the `cn()` helper).

- [ ] **Step 2: Add each required primitive**

```bash
npx shadcn@latest add button card badge separator tooltip sheet accordion navigation-menu
```

Expected: files created under `components/ui/`. Do not edit these files — they are the canonical shadcn source.

- [ ] **Step 3: Verify `lib/utils.ts` exists and exports `cn`**

```bash
cat lib/utils.ts
```

Expected output contains: `export function cn(...`

- [ ] **Step 4: Verify the build still passes**

```bash
npm run build
```

Expected: build succeeds, no TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add components/ui lib/utils.ts components.json package.json package-lock.json
git commit -m "feat: add shadcn/ui primitives (button, card, badge, separator, tooltip, sheet, accordion, navigation-menu)"
```

---

### Task 8: Build `ThemeToggle` component

**Files:**
- Create: `components/layout/theme-toggle.tsx`

- [ ] **Step 1: Install next-themes**

```bash
npm install next-themes
```

- [ ] **Step 2: Create `components/layout/theme-toggle.tsx`**

```tsx
// components/layout/theme-toggle.tsx
'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Avoid hydration mismatch — don't render until client
  useEffect(() => setMounted(true), [])
  if (!mounted) return <div className="w-16 h-7" /> // placeholder keeps layout stable

  return (
    <div
      className="flex items-center gap-0.5 rounded-full border px-1 py-1"
      style={{
        background: 'rgba(0,0,0,0.04)',
        borderColor: 'var(--color-border)',
      }}
    >
      {[
        { value: 'light', label: '☀️' },
        { value: 'dark', label: '🌙' },
      ].map(({ value, label }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          className="rounded-full px-2 py-0.5 text-xs font-medium transition-colors"
          style={{
            background: theme === value ? 'var(--color-text-primary)' : 'transparent',
            color: theme === value ? 'var(--color-bg-base)' : 'var(--color-text-muted)',
          }}
          aria-label={`Switch to ${value} mode`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add components/layout/theme-toggle.tsx package.json package-lock.json
git commit -m "feat: add ThemeToggle component"
```

---

### Task 9: Build `Nav` and `Footer` components, wire `ThemeProvider`

**Files:**
- Create: `components/layout/nav.tsx`, `components/layout/footer.tsx`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Create `components/layout/nav.tsx`**

Nav hides the toggle on `/` and `/the-tool` (always-dark pages).

```tsx
// components/layout/nav.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { siteConfig } from '@/config/site'
import { ThemeToggle } from './theme-toggle'

const ALWAYS_DARK_ROUTES = ['/', '/the-tool']

export function Nav() {
  const pathname = usePathname()
  const showToggle = !ALWAYS_DARK_ROUTES.includes(pathname)

  return (
    <header
      className="sticky top-0 z-50 border-b"
      style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-base)' }}
    >
      <div
        className="mx-auto flex h-14 items-center justify-between px-6"
        style={{ maxWidth: 'var(--container-width)' }}
      >
        <Link
          href="/"
          className="text-lg font-semibold tracking-tight"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)' }}
        >
          Brilliant Managers
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {siteConfig.nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-medium transition-colors hover:opacity-100"
              style={{ color: 'var(--color-text-muted)' }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {showToggle && <ThemeToggle />}
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
      </div>
    </header>
  )
}
```

- [ ] **Step 2: Create `components/layout/footer.tsx`**

Footer is always dark regardless of theme — it sits inside the dark page wrapper on homepage, and we force dark styles directly on other pages.

```tsx
// components/layout/footer.tsx
import Link from 'next/link'
import { siteConfig } from '@/config/site'

export function Footer() {
  return (
    <footer
      className="border-t"
      style={{
        background: '#1a3a5c',
        borderColor: 'rgba(254,252,247,0.08)',
      }}
    >
      <div
        className="mx-auto flex flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row"
        style={{ maxWidth: 'var(--container-width)' }}
      >
        <p className="text-xs" style={{ color: 'rgba(254,252,247,0.35)' }}>
          © {new Date().getFullYear()} Brilliant Managers
        </p>
        <div className="flex gap-5">
          {Object.entries(siteConfig.social).map(([key, url]) => (
            <Link
              key={key}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs capitalize"
              style={{ color: 'rgba(254,252,247,0.35)' }}
            >
              {key}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  )
}
```

- [ ] **Step 3: Update `app/layout.tsx` to add ThemeProvider, Nav, Footer, and analytics**

```tsx
// app/layout.tsx
import type { Metadata } from 'next'
import { Fraunces, Inter } from 'next/font/google'
import Script from 'next/script'
import { ThemeProvider } from 'next-themes'
import { Nav } from '@/components/layout/nav'
import { Footer } from '@/components/layout/footer'
import { siteConfig } from '@/config/site'
import './globals.css'

const fraunces = Fraunces({
  subsets: ['latin'],
  axes: ['opsz', 'SOFT', 'WONK'],
  variable: '--font-fraunces',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: siteConfig.title,
    template: `%s — ${siteConfig.title}`,
  },
  description: siteConfig.description,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${fraunces.variable} ${inter.variable}`}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <div className="flex min-h-screen flex-col">
            <Nav />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
        </ThemeProvider>
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${siteConfig.gaId}`}
          strategy="afterInteractive"
        />
        <Script id="ga-init" strategy="afterInteractive">
          {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${siteConfig.gaId}',{anonymize_ip:true})`}
        </Script>
      </body>
    </html>
  )
}
```

- [ ] **Step 4: Verify nav and footer render**

```bash
npm run dev
```

Expected: `http://localhost:3000` shows the nav bar (with "Brilliant Managers" logo, links, GitHub button) and the dark footer. Toggle visible on most pages.

- [ ] **Step 5: Commit**

```bash
git add components/layout/ app/layout.tsx package.json package-lock.json
git commit -m "feat: add Nav, Footer, ThemeProvider, GA analytics"
```

---

### Task 10: Set up MDX pipeline and content utilities

**Files:**
- Create: `lib/mdx.ts`, `lib/guide.ts`, `__tests__/lib/guide.test.ts`
- Modify: `next.config.ts`

- [ ] **Step 1: Install next-mdx-remote**

```bash
npm install next-mdx-remote
```

- [ ] **Step 2: Write the failing test for `lib/guide.ts`**

```ts
// __tests__/lib/guide.test.ts
import {
  GUIDE_SECTIONS,
  getPrevNextChapters,
} from '@/lib/guide'

describe('guide helpers', () => {
  it('GUIDE_SECTIONS lists all seven sections in reading order', () => {
    expect(GUIDE_SECTIONS).toEqual([
      'measurement',
      'self',
      'team',
      'strategy',
      'communications',
      'domain-expertise',
      'faq',
    ])
  })

  it('getPrevNextChapters returns null prev for first chapter', () => {
    const { prev } = getPrevNextChapters(['measurement'])
    expect(prev).toBeNull()
  })

  it('getPrevNextChapters returns null next for last chapter', () => {
    const { next } = getPrevNextChapters(['faq'])
    expect(next).toBeNull()
  })

  it('getPrevNextChapters returns both for middle chapter', () => {
    const { prev, next } = getPrevNextChapters(['team'])
    expect(prev?.slug).toEqual(['self'])
    expect(next?.slug).toEqual(['strategy'])
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

```bash
npm test -- __tests__/lib/guide.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/guide'`

- [ ] **Step 4: Create `lib/guide.ts`**

```ts
// lib/guide.ts
export const GUIDE_SECTIONS = [
  'measurement',
  'self',
  'team',
  'strategy',
  'communications',
  'domain-expertise',
  'faq',
] as const

export type GuideSection = (typeof GUIDE_SECTIONS)[number]

export const GUIDE_SECTION_LABELS: Record<GuideSection, string> = {
  measurement: 'Measurement',
  self: 'Self',
  team: 'Team',
  strategy: 'Strategy',
  communications: 'Communications',
  'domain-expertise': 'Domain Expertise',
  faq: 'FAQ',
}

export function getPrevNextChapters(slug: string[]): {
  prev: { label: string; slug: string[] } | null
  next: { label: string; slug: string[] } | null
} {
  const current = slug[0] as GuideSection
  const idx = GUIDE_SECTIONS.indexOf(current)

  const prev =
    idx > 0
      ? {
          label: GUIDE_SECTION_LABELS[GUIDE_SECTIONS[idx - 1]],
          slug: [GUIDE_SECTIONS[idx - 1]],
        }
      : null

  const next =
    idx < GUIDE_SECTIONS.length - 1
      ? {
          label: GUIDE_SECTION_LABELS[GUIDE_SECTIONS[idx + 1]],
          slug: [GUIDE_SECTIONS[idx + 1]],
        }
      : null

  return { prev, next }
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
npm test -- __tests__/lib/guide.test.ts
```

Expected: all 4 tests pass.

- [ ] **Step 6: Create `lib/mdx.ts`**

```ts
// lib/mdx.ts
import { compileMDX } from 'next-mdx-remote/rsc'
import { readFile, readdir } from 'fs/promises'
import path from 'path'

// ── Types ──────────────────────────────────────────────────────────────────

export interface GuideFrontmatter {
  title: string
  excerpt?: string
  weight?: number
}

export interface BlogFrontmatter {
  title: string
  date: string
  excerpt?: string
}

// ── Helpers ────────────────────────────────────────────────────────────────

const contentDir = path.join(process.cwd(), 'content')

async function readMdx(filePath: string) {
  return readFile(filePath, 'utf-8')
}

// ── Guide ──────────────────────────────────────────────────────────────────

export async function getGuideChapter(
  slug: string[],
  components: Record<string, React.ComponentType<any>> = {}
) {
  const filePath = path.join(contentDir, 'guide', `${slug.join('/')}.mdx`)
  const source = await readMdx(filePath)

  const { content, frontmatter } = await compileMDX<GuideFrontmatter>({
    source,
    components,
    options: { parseFrontmatter: true },
  })

  return { content, frontmatter }
}

export async function getGuideIndex(
  components: Record<string, React.ComponentType<any>> = {}
) {
  return getGuideChapter(['index'], components)
}

// ── Blog ───────────────────────────────────────────────────────────────────

export async function getBlogPost(
  slug: string,
  components: Record<string, React.ComponentType<any>> = {}
) {
  const filePath = path.join(contentDir, 'blog', `${slug}.mdx`)
  const source = await readMdx(filePath)

  const { content, frontmatter } = await compileMDX<BlogFrontmatter>({
    source,
    components,
    options: { parseFrontmatter: true },
  })

  return { content, frontmatter }
}

export async function getAllBlogPosts(): Promise<
  Array<{ slug: string; frontmatter: BlogFrontmatter }>
> {
  const blogDir = path.join(contentDir, 'blog')
  const files = await readdir(blogDir)
  const mdxFiles = files.filter((f) => f.endsWith('.mdx'))

  const posts = await Promise.all(
    mdxFiles.map(async (file) => {
      const slug = file.replace('.mdx', '')
      const source = await readMdx(path.join(blogDir, file))
      const { frontmatter } = await compileMDX<BlogFrontmatter>({
        source,
        options: { parseFrontmatter: true },
      })
      return { slug, frontmatter }
    })
  )

  return posts.sort(
    (a, b) =>
      new Date(b.frontmatter.date).getTime() -
      new Date(a.frontmatter.date).getTime()
  )
}
```

- [ ] **Step 7: Commit**

```bash
git add lib/mdx.ts lib/guide.ts __tests__/lib/guide.test.ts package.json package-lock.json
git commit -m "feat: add MDX content pipeline and guide navigation helpers"
```

---

## Phase 2 — Pages

### Task 11: Homepage section components

**Files:**
- Create: `components/sections/hero.tsx`, `components/sections/feature-grid.tsx`, `components/sections/pull-quote.tsx`

- [ ] **Step 1: Create `components/sections/hero.tsx`**

```tsx
// components/sections/hero.tsx
import Link from 'next/link'

interface HeroProps {
  eyebrow: string
  headline: React.ReactNode
  body: string
  primaryCta: { label: string; href: string }
  secondaryCta: { label: string; href: string }
}

export function Hero({ eyebrow, headline, body, primaryCta, secondaryCta }: HeroProps) {
  return (
    <section className="px-6 pb-16 pt-20" style={{ maxWidth: 'var(--container-width)', margin: '0 auto' }}>
      <p
        className="mb-3 text-xs font-semibold uppercase tracking-widest"
        style={{ color: 'rgba(254,252,247,0.40)', letterSpacing: '0.2em' }}
      >
        {eyebrow}
      </p>
      <span className="amber-rule" />
      <h1
        className="mb-5 leading-none tracking-tight"
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(2.5rem, 6vw, 4rem)',
          fontWeight: 700,
          letterSpacing: '-0.03em',
          color: '#fefcf7',
        }}
      >
        {headline}
      </h1>
      <p
        className="mb-8 max-w-lg text-base leading-relaxed"
        style={{ color: 'rgba(254,252,247,0.60)', fontSize: '17px' }}
      >
        {body}
      </p>
      <div className="flex flex-wrap gap-3">
        <Link
          href={primaryCta.href}
          className="rounded-md px-5 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90"
          style={{ background: '#fefcf7', color: '#1a3a5c' }}
        >
          {primaryCta.label}
        </Link>
        <Link
          href={secondaryCta.href}
          className="rounded-md border px-5 py-2.5 text-sm font-medium"
          style={{ borderColor: 'rgba(254,252,247,0.14)', color: '#fefcf7', background: 'rgba(254,252,247,0.07)' }}
        >
          {secondaryCta.label}
        </Link>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Create `components/sections/feature-grid.tsx`**

```tsx
// components/sections/feature-grid.tsx
import Link from 'next/link'

interface FeatureCard {
  icon: string
  title: string
  body: string
  href: string
  linkLabel: string
}

interface FeatureGridProps {
  cards: FeatureCard[]
}

export function FeatureGrid({ cards }: FeatureGridProps) {
  return (
    <section className="px-6 pb-20" style={{ maxWidth: 'var(--container-width)', margin: '0 auto' }}>
      <div className="grid gap-5 sm:grid-cols-3">
        {cards.map((card) => (
          <div
            key={card.href}
            className="rounded-xl p-5"
            style={{
              background: 'rgba(254,252,247,0.05)',
              border: '1px solid rgba(254,252,247,0.10)',
            }}
          >
            <div className="mb-3 text-2xl">{card.icon}</div>
            <h2
              className="mb-2 text-base font-semibold"
              style={{ fontFamily: 'var(--font-display)', color: '#fefcf7' }}
            >
              {card.title}
            </h2>
            <p
              className="mb-4 text-sm leading-relaxed"
              style={{ color: 'rgba(254,252,247,0.50)' }}
            >
              {card.body}
            </p>
            <Link
              href={card.href}
              className="text-xs font-semibold"
              style={{ color: '#f59e0b' }}
            >
              {card.linkLabel} →
            </Link>
          </div>
        ))}
      </div>
    </section>
  )
}
```

- [ ] **Step 3: Create `components/sections/pull-quote.tsx`**

```tsx
// components/sections/pull-quote.tsx
interface PullQuoteProps {
  quote: string
  attribution: string
}

export function PullQuote({ quote, attribution }: PullQuoteProps) {
  return (
    <section
      className="border-t px-6 py-16"
      style={{ borderColor: 'rgba(254,252,247,0.08)' }}
    >
      <div style={{ maxWidth: 'var(--container-width)', margin: '0 auto' }}>
        <blockquote
          className="italic leading-snug"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(1.1rem, 2.5vw, 1.4rem)',
            color: 'rgba(254,252,247,0.80)',
            maxWidth: '640px',
          }}
        >
          "{quote}"
        </blockquote>
        <cite
          className="mt-4 block text-xs not-italic uppercase tracking-widest"
          style={{ color: 'rgba(254,252,247,0.35)' }}
        >
          — {attribution}
        </cite>
      </div>
    </section>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add components/sections/
git commit -m "feat: add homepage section components (Hero, FeatureGrid, PullQuote)"
```

---

### Task 12: Homepage page

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Write `app/page.tsx`**

```tsx
// app/page.tsx
import { Hero } from '@/components/sections/hero'
import { FeatureGrid } from '@/components/sections/feature-grid'
import { PullQuote } from '@/components/sections/pull-quote'

export const metadata = {
  title: 'Brilliant Managers — A field guide to management',
}

export default function HomePage() {
  return (
    // div.dark forces dark-mode token values on this page regardless of user's theme
    <div className="dark" style={{ background: '#1a3a5c' }}>
      <Hero
        eyebrow="A field guide to management"
        headline={
          <>
            Most of us became managers{' '}
            <em style={{ color: '#f59e0b' }}>by accident.</em>
          </>
        }
        body="A framework for doing it on purpose — whether you're stepping into the role, a few years in, or two decades deep and still figuring it out."
        primaryCta={{ label: 'Read The Guide →', href: '/the-guide' }}
        secondaryCta={{ label: 'Try The Tool', href: '/the-tool' }}
      />
      <FeatureGrid
        cards={[
          {
            icon: '📖',
            title: 'The Guide',
            body: 'A structured framework across Self, Team, Strategy, Communications, and Domain Expertise.',
            href: '/the-guide',
            linkLabel: 'Start reading',
          },
          {
            icon: '🎯',
            title: 'The Tool',
            body: 'Score yourself against the framework. Understand your strengths and your growth edges.',
            href: '/the-tool',
            linkLabel: 'Open the scorecard',
          },
          {
            icon: '✍️',
            title: 'The Blog',
            body: 'Posts on management — the messy parts, the surprising parts, and the stuff no one tells you upfront.',
            href: '/blog',
            linkLabel: 'View posts',
          },
        ]}
      />
      <PullQuote
        quote="Management is the job of creating conditions where other people can do their best work. Everything else is administration."
        attribution="Brilliant Managers"
      />
    </div>
  )
}
```

- [ ] **Step 2: Verify the homepage renders correctly**

```bash
npm run dev
```

Expected: `http://localhost:3000` shows the dark navy homepage with Fraunces headline, amber italics, cream feature cards, pull-quote, and dark footer. Toggle is hidden from nav on this page.

- [ ] **Step 3: Commit**

```bash
git add app/page.tsx
git commit -m "feat: build homepage (always dark, hero + feature grid + pull quote)"
```

---

### Task 13: Tool landing page

**Files:**
- Create: `components/tool/scorecard-preview.tsx`, `app/the-tool/page.tsx`

- [ ] **Step 1: Create `components/tool/scorecard-preview.tsx`**

```tsx
// components/tool/scorecard-preview.tsx
import { SCORING_LEVELS, SCORING_LEVEL_COLORS } from '@/config/scoring'
import type { ScoringLevel } from '@/config/scoring'

interface SampleRow {
  label: string
  level: ScoringLevel | null
}

const SAMPLE_ROWS: SampleRow[] = [
  { label: 'Self-awareness', level: 'Proficient' },
  { label: 'Emotional regulation under pressure', level: 'Practising' },
  { label: 'Coaching instinct', level: 'Developing' },
  { label: 'Receiving feedback openly', level: 'Leading' },
  { label: 'Delegation and trust', level: null },
]

export function ScorecardPreview() {
  return (
    <div
      className="rounded-xl p-5"
      style={{ background: 'rgba(254,252,247,0.05)', border: '1px solid rgba(254,252,247,0.10)' }}
    >
      <p
        className="mb-4 text-xs font-semibold uppercase tracking-widest"
        style={{ color: 'rgba(254,252,247,0.35)' }}
      >
        Sample · Self pillar
      </p>
      <div className="space-y-2">
        {SAMPLE_ROWS.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-3">
            <span className="text-sm" style={{ color: 'rgba(254,252,247,0.75)' }}>
              {row.label}
            </span>
            {row.level ? (
              <span
                className={`rounded-md px-2.5 py-0.5 text-xs font-semibold ${SCORING_LEVEL_COLORS[row.level].bg} ${SCORING_LEVEL_COLORS[row.level].text}`}
              >
                {row.level}
              </span>
            ) : (
              <span
                className="rounded-md border px-2.5 py-0.5 text-xs"
                style={{ borderStyle: 'dashed', borderColor: 'rgba(254,252,247,0.15)', color: 'rgba(254,252,247,0.25)' }}
              >
                — not yet rated
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create `app/the-tool/page.tsx`**

```tsx
// app/the-tool/page.tsx
import Link from 'next/link'
import { ScorecardPreview } from '@/components/tool/scorecard-preview'

export const metadata = { title: 'The Tool' }

const GOOGLE_SHEET_URL =
  'https://docs.google.com/spreadsheets/d/your-sheet-id/edit'
// Replace with the real sheet URL before going live

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
              A structured self-assessment across the five pillars of the framework.
              Best done with your manager — not in isolation.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href={GOOGLE_SHEET_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md px-5 py-2.5 text-sm font-semibold"
                style={{ background: '#fefcf7', color: '#1a3a5c' }}
              >
                📊 Open current version (Google Sheets)
              </Link>
              <button
                className="rounded-md border px-5 py-2.5 text-sm font-medium"
                style={{ borderColor: 'rgba(254,252,247,0.14)', color: 'rgba(254,252,247,0.65)', background: 'rgba(254,252,247,0.06)' }}
              >
                Get notified when the app launches
              </button>
            </div>
          </div>

          {/* Preview card */}
          <ScorecardPreview />
        </div>

        {/* v2 coming strip */}
        <div
          className="mt-16 flex items-center gap-4 rounded-xl px-6 py-4"
          style={{ background: 'rgba(254,252,247,0.04)', border: '1px solid rgba(254,252,247,0.08)' }}
        >
          <span
            className="shrink-0 rounded-full border px-3 py-1 text-xs font-semibold"
            style={{ borderColor: 'rgba(245,158,11,0.35)', color: '#fbbf24', background: 'rgba(245,158,11,0.08)' }}
          >
            Coming in v2
          </span>
          <p className="text-sm" style={{ color: 'rgba(254,252,247,0.40)' }}>
            A native web app — save your scores, track progress over time, and share
            with your manager. No spreadsheet required.
          </p>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Replace the placeholder Google Sheet URL**

Open `app/the-tool/page.tsx` and replace `your-sheet-id` with the real sheet ID from the existing Google Sheet URL.

- [ ] **Step 4: Verify the page**

```bash
npm run dev
```

Expected: `http://localhost:3000/the-tool` shows dark navy, two-column layout, Fraunces headline with amber italic, scorecard preview card with named level badges, and the v2 strip. Toggle hidden in nav.

- [ ] **Step 5: Commit**

```bash
git add components/tool/ app/the-tool/
git commit -m "feat: build Tool landing (scorecard preview, Google Sheet CTA, v2 strip)"
```

---

### Task 14: Guide MDX components

**Files:**
- Create: `components/guide/callout.tsx`, `components/guide/pull-quote.tsx`, `components/guide/scoring-badge.tsx`, `components/guide/mdx-components.tsx`
- Create: `__tests__/components/guide/scoring-badge.test.tsx`

- [ ] **Step 1: Write the failing test for `ScoringBadge`**

```tsx
// __tests__/components/guide/scoring-badge.test.tsx
import { render, screen } from '@testing-library/react'
import { ScoringBadge } from '@/components/guide/scoring-badge'

describe('ScoringBadge', () => {
  it('renders the level name', () => {
    render(<ScoringBadge level="Proficient" />)
    expect(screen.getByText('Proficient')).toBeInTheDocument()
  })

  it('renders the level description in the tooltip trigger area', () => {
    render(<ScoringBadge level="Developing" />)
    expect(screen.getByText('Developing')).toBeInTheDocument()
  })

  it('renders all four levels without crashing', () => {
    const levels = ['Developing', 'Practising', 'Proficient', 'Leading'] as const
    levels.forEach((level) => {
      const { unmount } = render(<ScoringBadge level={level} />)
      expect(screen.getByText(level)).toBeInTheDocument()
      unmount()
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- __tests__/components/guide/scoring-badge.test.tsx
```

Expected: FAIL — `Cannot find module '@/components/guide/scoring-badge'`

- [ ] **Step 3: Create `components/guide/scoring-badge.tsx`**

```tsx
// components/guide/scoring-badge.tsx
import { SCORING_LEVEL_COLORS, SCORING_LEVEL_DESCRIPTIONS } from '@/config/scoring'
import type { ScoringLevel } from '@/config/scoring'

interface ScoringBadgeProps {
  level: ScoringLevel
}

export function ScoringBadge({ level }: ScoringBadgeProps) {
  const colors = SCORING_LEVEL_COLORS[level]
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${colors.bg} ${colors.text}`}
      title={SCORING_LEVEL_DESCRIPTIONS[level]}
    >
      {level}
    </span>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- __tests__/components/guide/scoring-badge.test.tsx
```

Expected: all 3 tests pass.

- [ ] **Step 5: Create `components/guide/callout.tsx`**

```tsx
// components/guide/callout.tsx
interface CalloutProps {
  children: React.ReactNode
  type?: 'tip' | 'warning'
}

export function Callout({ children, type = 'tip' }: CalloutProps) {
  return (
    <div
      className="my-6 rounded-r-lg py-3 pl-4 pr-4 text-sm leading-relaxed"
      style={{
        borderLeft: `3px solid ${type === 'warning' ? '#ef4444' : 'var(--color-accent)'}`,
        background: type === 'warning' ? 'rgba(239,68,68,0.05)' : 'rgba(217,119,6,0.05)',
        color: 'var(--color-text-muted)',
      }}
    >
      {children}
    </div>
  )
}
```

- [ ] **Step 6: Create `components/guide/pull-quote.tsx`**

```tsx
// components/guide/pull-quote.tsx
interface GuidePullQuoteProps {
  children: React.ReactNode
  cite?: string
}

export function GuidePullQuote({ children, cite }: GuidePullQuoteProps) {
  return (
    <blockquote className="my-8 border-l-0 pl-0">
      <p
        className="italic leading-snug"
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: '1.25rem',
          color: 'var(--color-text-primary)',
        }}
      >
        {children}
      </p>
      {cite && (
        <cite
          className="mt-2 block text-xs not-italic uppercase tracking-widest"
          style={{ color: 'var(--color-text-muted)' }}
        >
          — {cite}
        </cite>
      )}
    </blockquote>
  )
}
```

- [ ] **Step 7: Create `components/guide/mdx-components.tsx`**

This is the single map passed to `compileMDX` — one place to register all custom MDX components.

```tsx
// components/guide/mdx-components.tsx
import { Callout } from './callout'
import { GuidePullQuote } from './pull-quote'
import { ScoringBadge } from './scoring-badge'

export const guideComponents = {
  Callout,
  PullQuote: GuidePullQuote,
  ScoringBadge,
}
```

- [ ] **Step 8: Commit**

```bash
git add components/guide/ __tests__/components/guide/
git commit -m "feat: add guide MDX components (Callout, PullQuote, ScoringBadge)"
```

---

### Task 15: Guide sidebar and TOC components

**Files:**
- Create: `components/guide/chapter-nav.tsx`, `components/guide/chapter-toc.tsx`

- [ ] **Step 1: Create `components/guide/chapter-nav.tsx`**

```tsx
// components/guide/chapter-nav.tsx
import Link from 'next/link'
import { GUIDE_SECTIONS, GUIDE_SECTION_LABELS } from '@/lib/guide'

interface ChapterNavProps {
  activeSlug: string
}

export function ChapterNav({ activeSlug }: ChapterNavProps) {
  return (
    <nav className="sticky top-20 w-52 shrink-0 self-start">
      <p
        className="mb-3 text-xs font-semibold uppercase tracking-widest"
        style={{ color: 'var(--color-text-muted)', letterSpacing: '0.12em' }}
      >
        The Guide
      </p>
      <ul className="space-y-0.5">
        {GUIDE_SECTIONS.map((section) => {
          const isActive = activeSlug === section
          return (
            <li key={section}>
              <Link
                href={`/the-guide/${section}`}
                className="block rounded-md px-3 py-2 text-sm font-medium transition-colors"
                style={{
                  background: isActive ? '#1a3a5c' : 'transparent',
                  color: isActive ? '#fefcf7' : 'var(--color-text-muted)',
                }}
              >
                {GUIDE_SECTION_LABELS[section]}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
```

- [ ] **Step 2: Create `components/guide/chapter-toc.tsx`**

TOC is a server component that accepts headings extracted from the MDX. For now it renders a static list; active-highlight on scroll can be added as a follow-up enhancement.

```tsx
// components/guide/chapter-toc.tsx
interface TocItem {
  id: string
  text: string
  level: number
}

interface ChapterTocProps {
  items: TocItem[]
}

export function ChapterToc({ items }: ChapterTocProps) {
  if (items.length === 0) return null

  return (
    <nav className="sticky top-20 w-40 shrink-0 self-start">
      <p
        className="mb-3 text-xs font-semibold uppercase tracking-widest"
        style={{ color: 'var(--color-text-muted)', letterSpacing: '0.12em' }}
      >
        On this page
      </p>
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item.id} style={{ paddingLeft: item.level === 3 ? '8px' : '0' }}>
            <a
              href={`#${item.id}`}
              className="block text-xs leading-relaxed transition-colors hover:opacity-100"
              style={{ color: 'var(--color-text-muted)', opacity: 0.65 }}
            >
              {item.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add components/guide/chapter-nav.tsx components/guide/chapter-toc.tsx
git commit -m "feat: add guide ChapterNav and ChapterToc components"
```

---

### Task 16: Guide index and chapter pages

**Files:**
- Create: `app/the-guide/page.tsx`, `app/the-guide/[...slug]/page.tsx`
- Create: `content/guide/index.mdx` (stub)

- [ ] **Step 1: Create stub `content/guide/index.mdx`**

```mdx
---
title: Welcome to Brilliant Managers
excerpt: A framework for doing management on purpose.
---

How did you get into management? Were you supported, guided, coached, and given full context on what was expected?

Most of us stumble into it. This guide is for everyone who wants to do it deliberately.
```

- [ ] **Step 2: Create `app/the-guide/page.tsx`**

```tsx
// app/the-guide/page.tsx
import Link from 'next/link'
import { GUIDE_SECTIONS, GUIDE_SECTION_LABELS } from '@/lib/guide'

export const metadata = { title: 'The Guide' }

const SECTION_EXCERPTS: Record<string, string> = {
  measurement: 'How to think about progress — in yourself and in others.',
  self: 'Understanding yourself before you can lead anyone else.',
  team: 'Building an environment where people do their best work.',
  strategy: 'Connecting day-to-day work to longer-term direction.',
  communications: 'Saying the right things to the right people at the right time.',
  'domain-expertise': 'Knowing enough to lead without needing to know everything.',
  faq: 'The questions that come up again and again.',
}

export default function GuideIndexPage() {
  return (
    <div style={{ background: 'var(--color-bg-base)', minHeight: '100vh' }}>
      <div
        className="mx-auto px-6 pb-20 pt-16"
        style={{ maxWidth: 'var(--container-width)' }}
      >
        <header className="mb-12">
          <p
            className="mb-3 text-xs font-semibold uppercase tracking-widest"
            style={{ color: 'var(--color-accent)', letterSpacing: '0.18em' }}
          >
            A Field Guide
          </p>
          <span className="amber-rule" />
          <h1
            className="mb-4"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
              fontWeight: 600,
              letterSpacing: '-0.02em',
              color: 'var(--color-text-primary)',
            }}
          >
            The Guide
          </h1>
          <p className="max-w-xl text-base leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
            A framework for doing management on purpose — whether you're considering the role,
            new to it, or two decades in and still figuring it out.
          </p>
        </header>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {GUIDE_SECTIONS.map((section) => (
            <Link
              key={section}
              href={`/the-guide/${section}`}
              className="group rounded-xl border p-5 transition-shadow hover:shadow-md"
              style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-reading)' }}
            >
              <h2
                className="mb-2 text-base font-semibold"
                style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)' }}
              >
                {GUIDE_SECTION_LABELS[section]}
              </h2>
              <p className="mb-4 text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                {SECTION_EXCERPTS[section]}
              </p>
              <span className="text-xs font-semibold" style={{ color: 'var(--color-accent)' }}>
                Start reading →
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create `app/the-guide/[...slug]/page.tsx`**

```tsx
// app/the-guide/[...slug]/page.tsx
import { notFound } from 'next/navigation'
import { getGuideChapter } from '@/lib/mdx'
import { getPrevNextChapters, GUIDE_SECTION_LABELS, GUIDE_SECTIONS } from '@/lib/guide'
import { guideComponents } from '@/components/guide/mdx-components'
import { ChapterNav } from '@/components/guide/chapter-nav'
import { ChapterToc } from '@/components/guide/chapter-toc'
import Link from 'next/link'

interface Props {
  params: Promise<{ slug: string[] }>
}

export async function generateStaticParams() {
  return GUIDE_SECTIONS.map((section) => ({ slug: [section] }))
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  const section = slug[0] as keyof typeof GUIDE_SECTION_LABELS
  return { title: GUIDE_SECTION_LABELS[section] ?? 'The Guide' }
}

export default async function GuideChapterPage({ params }: Props) {
  const { slug } = await params

  let chapter
  try {
    chapter = await getGuideChapter(slug, guideComponents)
  } catch {
    notFound()
  }

  const { prev, next } = getPrevNextChapters(slug)
  const activeSlug = slug[0]

  return (
    <div style={{ background: 'var(--color-bg-base)', minHeight: '100vh' }}>
      <div
        className="mx-auto flex gap-8 px-6 py-12"
        style={{ maxWidth: 'var(--container-width)' }}
      >
        {/* Sidebar */}
        <aside className="hidden lg:block">
          <ChapterNav activeSlug={activeSlug} />
        </aside>

        {/* Main content */}
        <article className="min-w-0 flex-1">
          <header className="mb-8">
            <p
              className="mb-3 text-xs font-semibold uppercase tracking-widest"
              style={{ color: 'var(--color-accent)', letterSpacing: '0.18em' }}
            >
              {GUIDE_SECTION_LABELS[activeSlug as keyof typeof GUIDE_SECTION_LABELS]}
            </p>
            <span className="amber-rule" />
            <h1
              className="leading-tight"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(1.5rem, 3.5vw, 2rem)',
                fontWeight: 600,
                letterSpacing: '-0.02em',
                color: 'var(--color-text-primary)',
              }}
            >
              {chapter.frontmatter.title}
            </h1>
          </header>

          <div className="prose">{chapter.content}</div>

          {/* Prev/next navigation */}
          <div
            className="mt-12 flex justify-between border-t pt-6"
            style={{ borderColor: 'var(--color-border)' }}
          >
            {prev ? (
              <Link
                href={`/the-guide/${prev.slug[0]}`}
                className="text-sm font-medium"
                style={{ color: 'var(--color-accent)' }}
              >
                ← {prev.label}
              </Link>
            ) : (
              <span />
            )}
            {next && (
              <Link
                href={`/the-guide/${next.slug[0]}`}
                className="text-sm font-medium"
                style={{ color: 'var(--color-accent)' }}
              >
                {next.label} →
              </Link>
            )}
          </div>
        </article>

        {/* TOC — stub for now; populated when chapter content has headings */}
        <aside className="hidden xl:block">
          <ChapterToc items={[]} />
        </aside>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Verify the guide loads**

```bash
npm run dev
```

Expected: `http://localhost:3000/the-guide` shows the pillar card grid. `http://localhost:3000/the-guide/self` shows the stub chapter (404 is expected — the MDX files don't exist yet; that's Phase 3).

- [ ] **Step 5: Commit**

```bash
git add app/the-guide/ content/guide/index.mdx
git commit -m "feat: build guide index and chapter pages"
```

---

### Task 17: Blog pages

**Files:**
- Create: `app/blog/page.tsx`, `app/blog/[slug]/page.tsx`
- Create: `content/blog/hello-world.mdx` (ported from existing)

- [ ] **Step 1: Port existing blog post to MDX**

Read the existing content at `src/pages/blog/hello-world.md` (or from git history since `src/` was deleted). Create:

```mdx
---
title: Hello World
date: "2020-12-17"
excerpt: "The first post on Brilliant Managers — a quick introduction to what this site is about."
---

Welcome to Brilliant Managers.

This is the first post on the blog. More to come.
```

Save to: `content/blog/hello-world.mdx`

- [ ] **Step 2: Create `app/blog/page.tsx`**

```tsx
// app/blog/page.tsx
import Link from 'next/link'
import { getAllBlogPosts } from '@/lib/mdx'
import { Separator } from '@/components/ui/separator'

export const metadata = { title: 'Blog' }

export default async function BlogIndexPage() {
  const posts = await getAllBlogPosts()

  return (
    <div style={{ background: 'var(--color-bg-base)', minHeight: '100vh' }}>
      <div
        className="mx-auto px-6 pb-20 pt-16"
        style={{ maxWidth: 'var(--container-width)' }}
      >
        <header className="mb-6">
          <p
            className="mb-3 text-xs font-semibold uppercase tracking-widest"
            style={{ color: 'var(--color-accent)', letterSpacing: '0.18em' }}
          >
            Writing on management
          </p>
          <span className="amber-rule" />
          <h1
            className="mb-2"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
              fontWeight: 600,
              letterSpacing: '-0.02em',
              color: 'var(--color-text-primary)',
            }}
          >
            The Blog
          </h1>
          <p className="text-base" style={{ color: 'var(--color-text-muted)' }}>
            Notes from the field — the messy parts, the surprising parts, and the stuff no one tells you upfront.
          </p>
        </header>

        <Separator className="mb-8" style={{ background: 'var(--color-border)' }} />

        <div className="grid gap-6 sm:grid-cols-2">
          {posts.map((post) => (
            <article
              key={post.slug}
              className="rounded-xl border p-5"
              style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-reading)' }}
            >
              <time
                className="mb-2 block text-xs uppercase tracking-widest"
                style={{ color: 'var(--color-text-muted)', opacity: 0.6 }}
                dateTime={post.frontmatter.date}
              >
                {new Date(post.frontmatter.date).toLocaleDateString('en-GB', {
                  month: 'long',
                  year: 'numeric',
                })}
              </time>
              <h2
                className="mb-2 text-lg font-semibold leading-snug"
                style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)' }}
              >
                <Link href={`/blog/${post.slug}`} className="hover:opacity-80">
                  {post.frontmatter.title}
                </Link>
              </h2>
              {post.frontmatter.excerpt && (
                <p className="mb-4 text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                  {post.frontmatter.excerpt}
                </p>
              )}
              <Link
                href={`/blog/${post.slug}`}
                className="text-xs font-semibold"
                style={{ color: 'var(--color-accent)' }}
              >
                Read →
              </Link>
            </article>
          ))}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create `app/blog/[slug]/page.tsx`**

```tsx
// app/blog/[slug]/page.tsx
import { notFound } from 'next/navigation'
import { getBlogPost, getAllBlogPosts } from '@/lib/mdx'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  const posts = await getAllBlogPosts()
  return posts.map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  try {
    const { frontmatter } = await getBlogPost(slug)
    return { title: frontmatter.title }
  } catch {
    return { title: 'Post not found' }
  }
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params

  let post
  try {
    post = await getBlogPost(slug)
  } catch {
    notFound()
  }

  return (
    <div style={{ background: 'var(--color-bg-base)', minHeight: '100vh' }}>
      <div
        className="mx-auto px-6 pb-20 pt-16"
        style={{ maxWidth: 'var(--prose-width)' }}
      >
        <header className="mb-10">
          <time
            className="mb-3 block text-xs uppercase tracking-widest"
            style={{ color: 'var(--color-text-muted)', opacity: 0.6 }}
            dateTime={post.frontmatter.date}
          >
            {new Date(post.frontmatter.date).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </time>
          <span className="amber-rule" />
          <h1
            className="leading-tight"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
              fontWeight: 600,
              letterSpacing: '-0.02em',
              color: 'var(--color-text-primary)',
            }}
          >
            {post.frontmatter.title}
          </h1>
        </header>
        <div className="prose">{post.content}</div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Verify blog loads**

```bash
npm run dev
```

Expected: `http://localhost:3000/blog` shows the Hello World post card. `/blog/hello-world` shows the post content.

- [ ] **Step 5: Commit**

```bash
git add app/blog/ content/blog/hello-world.mdx
git commit -m "feat: build blog index and post pages"
```

---

### Task 18: Resources and 404 pages

**Files:**
- Create: `app/resources/page.tsx`, `app/not-found.tsx`

- [ ] **Step 1: Create `app/resources/page.tsx`**

```tsx
// app/resources/page.tsx
export const metadata = { title: 'Resources' }

const RESOURCES = {
  Books: [
    {
      title: 'An Elegant Puzzle — Will Larson',
      annotation: 'Systems thinking for engineering leaders. The best mental models I've found for scaling teams without losing quality.',
    },
    {
      title: 'The Manager's Path — Camille Fournier',
      annotation: 'A practical guide through every stage of the engineering management career. Rare in that it's honest about the hard parts.',
    },
    {
      title: 'Radical Candor — Kim Scott',
      annotation: 'The framework for giving feedback that people can actually receive. Read it before you think you don't need it.',
    },
  ],
  Articles: [
    {
      title: 'Give Away Your Legos — Molly Graham',
      annotation: 'The definitive piece on letting go of work as your team grows. Required reading for anyone moving into leadership.',
    },
    {
      title: 'Staff Engineer Archetypes — Will Larson',
      annotation: 'Useful not just for staff engineers but for managers thinking about how to develop senior ICs.',
    },
  ],
  People: [
    {
      title: 'Charity Majors (@mipsytipsy)',
      annotation: 'Honest, opinionated takes on engineering management and observability. One of the few people worth following unconditionally.',
    },
    {
      title: 'Lara Hogan',
      annotation: 'Research-backed writing on management, feedback, and leadership. Her resilience questions are worth bookmarking.',
    },
  ],
}

export default function ResourcesPage() {
  return (
    <div style={{ background: 'var(--color-bg-base)', minHeight: '100vh' }}>
      <div
        className="mx-auto px-6 pb-20 pt-16"
        style={{ maxWidth: 'var(--prose-width)' }}
      >
        <header className="mb-12">
          <p
            className="mb-3 text-xs font-semibold uppercase tracking-widest"
            style={{ color: 'var(--color-accent)', letterSpacing: '0.18em' }}
          >
            Curated
          </p>
          <span className="amber-rule" />
          <h1
            className="mb-4"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
              fontWeight: 600,
              letterSpacing: '-0.02em',
              color: 'var(--color-text-primary)',
            }}
          >
            Resources
          </h1>
          <p style={{ color: 'var(--color-text-muted)' }}>
            Things I keep coming back to. No affiliate links. No filler.
          </p>
        </header>

        {Object.entries(RESOURCES).map(([category, items]) => (
          <section key={category} className="mb-12">
            <h2
              className="mb-5 text-sm font-semibold uppercase tracking-widest"
              style={{ color: 'var(--color-text-muted)', opacity: 0.6 }}
            >
              {category}
            </h2>
            <ul className="space-y-5">
              {items.map((item) => (
                <li
                  key={item.title}
                  className="border-l-2 pl-4"
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  <p className="mb-1 text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                    {item.title}
                  </p>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                    {item.annotation}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create `app/not-found.tsx`**

```tsx
// app/not-found.tsx
import Link from 'next/link'

export default function NotFound() {
  return (
    <div
      className="dark flex min-h-[80vh] flex-col items-center justify-center px-6 text-center"
      style={{ background: '#1a3a5c' }}
    >
      <p
        className="mb-4 text-xs font-semibold uppercase tracking-widest"
        style={{ color: 'rgba(254,252,247,0.38)', letterSpacing: '0.2em' }}
      >
        404
      </p>
      <span className="amber-rule mx-auto" />
      <h1
        className="mb-4 italic"
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(2rem, 5vw, 3rem)',
          fontWeight: 600,
          color: '#fefcf7',
          letterSpacing: '-0.02em',
        }}
      >
        You've gone off-piste.
      </h1>
      <p className="mb-8 text-base" style={{ color: 'rgba(254,252,247,0.55)' }}>
        This page doesn't exist — but the guide does.
      </p>
      <Link
        href="/the-guide"
        className="rounded-md px-5 py-2.5 text-sm font-semibold"
        style={{ background: '#fefcf7', color: '#1a3a5c' }}
      >
        Back to The Guide →
      </Link>
    </div>
  )
}
```

- [ ] **Step 3: Verify both pages**

```bash
npm run dev
```

Expected: `http://localhost:3000/resources` renders the curated list. `http://localhost:3000/anything-fake` shows the dark 404 with italic headline.

- [ ] **Step 4: Run full test suite**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add app/resources/ app/not-found.tsx
git commit -m "feat: build Resources page and 404"
```

---

## Phase 3 — Content

### Task 19: Port all guide chapters to MDX

**Files:**
- Create: `content/guide/measurement.mdx`, `content/guide/self.mdx`, `content/guide/team.mdx`, `content/guide/strategy.mdx`, `content/guide/communications.mdx`, `content/guide/domain-expertise.mdx`, `content/guide/faq.mdx`

The original content lives in git history under `src/pages/the-guide/`. Recover it:

- [ ] **Step 1: Extract original content from git history**

```bash
git show 6a048ac:src/pages/the-guide/self/index.md
# Repeat for each section. Adjust commit hash if needed — use the last commit before the redesign branch was created.
git log --oneline master | head -5
```

- [ ] **Step 2: Create each MDX file**

For each of the seven sections, create `content/guide/<section>.mdx` with this structure:

```mdx
---
title: <section title>
excerpt: <one-sentence description>
---

<ported content here, converted from markdown>
```

Convert any HTML in the original content to JSX. Plain markdown paragraphs, headings, and lists work without change. The `<div class="note">` blocks from the original become `<Callout>` components:

**Before (old markdown):**
```html
<div class="note">
#### To complete your own manager scorecard, use [the tool](/the-tool)
</div>
```

**After (MDX):**
```mdx
<Callout>
To complete your own manager scorecard, use [the tool](/the-tool).
</Callout>
```

- [ ] **Step 3: Verify each chapter loads**

```bash
npm run dev
```

Visit each chapter URL in turn:
- `http://localhost:3000/the-guide/measurement`
- `http://localhost:3000/the-guide/self`
- `http://localhost:3000/the-guide/team`
- `http://localhost:3000/the-guide/strategy`
- `http://localhost:3000/the-guide/communications`
- `http://localhost:3000/the-guide/domain-expertise`
- `http://localhost:3000/the-guide/faq`

Expected: each page renders with the chapter title in Fraunces, prose content, and prev/next navigation.

- [ ] **Step 4: Commit**

```bash
git add content/guide/
git commit -m "feat: port all guide chapters to MDX"
```

---

### Task 20: Rewrite homepage and tool copy; update guide intros

**Files:**
- Modify: `app/page.tsx` (hero copy)
- Modify: `app/the-tool/page.tsx` (body copy)
- Modify: `content/guide/index.mdx` (intro)
- Modify: `content/guide/*.mdx` (chapter intro paragraphs)

The design spec grants full rewrite licence. Copy should be statement-mode (short, punchy, confident) for marketing surfaces, and reflective/substantive for the guide.

- [ ] **Step 1: Review and improve homepage hero copy in `app/page.tsx`**

The headline `"Most of us became managers by accident."` is already set. Review the body copy and feature card descriptions for the editorial-bold voice. They should not hedge. No "could", "might", "perhaps".

Example improved body:
- Before: `"A framework for doing it on purpose — whether you're stepping into the role..."`
- After: `"A framework — not a manual. It won't tell you what to do. It'll help you see where you are."`

Adjust to your own voice.

- [ ] **Step 2: Review and improve tool copy in `app/the-tool/page.tsx`**

Ensure the body text is direct. The two CTAs are fixed:
- "📊 Open current version (Google Sheets)" → replace the placeholder `GOOGLE_SHEET_URL` with the real URL.
- "Get notified when the app launches" → this button does nothing for now; that's intentional (v2).

- [ ] **Step 3: Rewrite guide chapter intro paragraphs in MDX files**

For each chapter, the opening paragraph sets the tone. Rewrite each to match the second-person reflective register. Example for `self.mdx`:

```mdx
Before you can lead anyone else, you need a reasonably clear-eyed view of yourself.
Not perfect — just honest. How you react under pressure. What you reach for when things get hard.
The instincts that have served you, and the ones that haven't.

This chapter is an invitation to sit with that — ideally with someone who can reflect it back to you.
```

- [ ] **Step 4: Verify the site end-to-end**

```bash
npm run dev
```

Walk through every page: `/`, `/the-guide`, each chapter, `/the-tool`, `/blog`, `/blog/hello-world`, `/resources`, plus a fake URL for 404.

- [ ] **Step 5: Commit**

```bash
git add app/page.tsx app/the-tool/page.tsx content/guide/
git commit -m "feat: rewrite homepage, tool, and guide chapter copy"
```

---

## Phase 4 — Cutover

### Task 21: Production build verification

**Files:**
- Modify: `netlify.toml`

- [ ] **Step 1: Run a production build locally**

```bash
npm run build
```

Expected: build completes with no TypeScript errors and no missing page errors. Note any warnings in output.

- [ ] **Step 2: Serve the build locally and walk through the site**

```bash
npm start
```

Visit `http://localhost:3000` and walk every page. Confirm:
- Homepage is dark, toggle hidden
- `/the-tool` is dark, toggle hidden
- All other pages show toggle, light by default
- Dark mode toggle works and persists on refresh
- All guide chapters render prose correctly
- Blog index shows posts, post page renders
- Resources page renders
- 404 shows for a fake URL
- Footer is dark on all pages

- [ ] **Step 3: Merge `origin/master` into the branch**

```bash
git fetch origin master
git merge origin/master
```

Resolve any conflicts (unlikely — master hasn't changed). Re-run `npm run build` after merging.

- [ ] **Step 4: Update `netlify.toml`**

```toml
[build]
command = "npm run build"
publish = ".next"

[[plugins]]
package = "@netlify/plugin-nextjs"
```

- [ ] **Step 5: Install the Netlify Next.js plugin**

```bash
npm install -D @netlify/plugin-nextjs
```

- [ ] **Step 6: Push branch and create a Netlify preview deploy**

```bash
git add netlify.toml package.json package-lock.json
git commit -m "feat: update netlify.toml for Next.js 15"
git push origin redesign/nextjs-migration
```

In the Netlify dashboard: confirm the branch deploy builds successfully and the preview URL renders correctly.

- [ ] **Step 7: Run full test suite one final time**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 8: Show diff to reviewer and get explicit approval before merging**

```bash
git diff master...redesign/nextjs-migration --stat
```

Do not merge or create a PR until the diff has been reviewed and approved.

---

## Self-review checklist

Spec sections vs plan coverage:

| Spec section | Covered by |
|---|---|
| 2. Tech stack (Next.js, TS, Tailwind v4, shadcn, MDX, next-themes, Netlify) | Tasks 1–7, 21 |
| 3.1 Editorial-bold direction | Tasks 11–12 (Hero, homepage) |
| 3.2 Typography (Fraunces + Inter tokens) | Task 3 |
| 3.3 Colour tokens (dark/light) | Task 2 |
| 3.4 Spacing/layout tokens | Task 2 |
| 3.5 Theme toggle (hidden on homepage + tool) | Tasks 8–9 |
| 3.6 shadcn primitives | Task 7 |
| 4.1 Homepage | Tasks 11–12 |
| 4.2 Guide index | Task 16 |
| 4.3 Guide chapter (sidebar, TOC, prev/next) | Tasks 15–16 |
| 4.4 Tool landing | Task 13 |
| 4.5 Blog index | Task 17 |
| 4.6 Blog post | Task 17 |
| 4.7 Resources | Task 18 |
| 4.8 404 | Task 18 |
| 5. Scoring levels (4 named levels, ScoringBadge) | Tasks 5, 13, 14 |
| 6. MDX migration + guide components (Callout, PullQuote, ScoringBadge) | Tasks 10, 14, 19 |
| 7. Build & rollout (4 phases) | Tasks 1, 21 |
