# Resources Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single-page resources view with a nested `/resources/[type]` route structure — side nav, clean deep-linkable URLs, and 24-hour ISR caching so no DB call is made per visitor request.

**Architecture:** A shared `TYPE_CONFIG` array (slug → dbType → label) is the single source of truth for URL design and nav rendering. `app/resources/layout.tsx` renders the page chrome, desktop side nav, and mobile tab strip. `app/resources/[type]/page.tsx` renders the per-type resource list with `export const revalidate = 86400` (ISR). `app/resources/page.tsx` becomes a one-line redirect to `/resources/books`.

**Tech Stack:** Next.js 15 App Router (server components, ISR, `generateStaticParams`, async params/Promise), Supabase, TypeScript, Tailwind CSS, Vitest + React Testing Library.

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `app/resources/type-config.ts` | Create | Shared slug→dbType→label lookup |
| `lib/db/resources.ts` | Modify | Add `getResourcesByType` |
| `components/resources/ResourceNavItem.tsx` | Create | Client component, reads `usePathname` for active state |
| `components/resources/__tests__/ResourceNavItem.test.tsx` | Create | Tests for active/inactive rendering |
| `app/resources/layout.tsx` | Create | Page chrome, desktop side nav, mobile tab strip |
| `app/resources/[type]/page.tsx` | Create | ISR resource list per type, `generateStaticParams` |
| `app/resources/page.tsx` | Modify | Replace entirely with redirect to /resources/books |

---

### Task 1: TYPE_CONFIG lookup table

**Files:**
- Create: `app/resources/type-config.ts`

- [ ] **Step 1: Create `app/resources/type-config.ts`**

```ts
import type { Resource } from '@/lib/db/resources'

export interface TypeConfig {
  slug: string
  dbType: Resource['resource_type']
  label: string
}

export const TYPE_CONFIG: TypeConfig[] = [
  { slug: 'books',    dbType: 'book',    label: 'Books' },
  { slug: 'articles', dbType: 'article', label: 'Articles' },
  { slug: 'courses',  dbType: 'course',  label: 'Courses' },
  { slug: 'videos',   dbType: 'video',   label: 'Videos' },
  { slug: 'people',   dbType: 'person',  label: 'People worth following' },
  { slug: 'podcasts', dbType: 'podcast', label: 'Podcasts' },
  { slug: 'tools',    dbType: 'tool',    label: 'Tools & assessments' },
]
```

- [ ] **Step 2: Run tests to confirm nothing broken**

```bash
npx vitest run
```
Expected: all 95 tests pass.

- [ ] **Step 3: Commit**

```bash
git add app/resources/type-config.ts
git commit -m "feat: add TYPE_CONFIG lookup table for resources route slugs"
```

---

### Task 2: `getResourcesByType` DB helper

**Files:**
- Modify: `lib/db/resources.ts`

The current file ends after `getAllResources`. Add the new function at the bottom of the file.

- [ ] **Step 1: Add `getResourcesByType` to `lib/db/resources.ts`**

Append to the end of the file:

```ts
export async function getResourcesByType(type: Resource['resource_type']): Promise<Resource[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('resources')
    .select('*')
    .eq('resource_type', type)
    .order('title')
  if (error) throw error
  return (data ?? []) as Resource[]
}
```

- [ ] **Step 2: Run tests**

```bash
npx vitest run
```
Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add lib/db/resources.ts
git commit -m "feat: add getResourcesByType DB helper"
```

---

### Task 3: ResourceNavItem client component + tests

**Files:**
- Create: `components/resources/ResourceNavItem.tsx`
- Create: `components/resources/__tests__/ResourceNavItem.test.tsx`

The `components/resources/` directory does not exist yet — create it. The component needs a `tab` prop because the mobile and desktop nav items have different visual treatments: the desktop item uses a left-border active indicator; the mobile tab uses a pill background.

- [ ] **Step 1: Write the failing tests**

Create `components/resources/__tests__/ResourceNavItem.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { usePathname } from 'next/navigation'
import { ResourceNavItem } from '../ResourceNavItem'

vi.mock('next/navigation', () => ({ usePathname: vi.fn() }))

describe('ResourceNavItem', () => {
  it('renders a link with the correct label and href', () => {
    vi.mocked(usePathname).mockReturnValue('/resources/articles')
    render(<ResourceNavItem href="/resources/books" label="Books" />)
    const link = screen.getByRole('link', { name: 'Books' })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/resources/books')
  })

  it('sets aria-current="page" when pathname matches href', () => {
    vi.mocked(usePathname).mockReturnValue('/resources/books')
    render(<ResourceNavItem href="/resources/books" label="Books" />)
    expect(screen.getByRole('link', { name: 'Books' })).toHaveAttribute('aria-current', 'page')
  })

  it('does not set aria-current when pathname differs', () => {
    vi.mocked(usePathname).mockReturnValue('/resources/articles')
    render(<ResourceNavItem href="/resources/books" label="Books" />)
    expect(screen.getByRole('link', { name: 'Books' })).not.toHaveAttribute('aria-current')
  })

  it('renders correctly in tab variant', () => {
    vi.mocked(usePathname).mockReturnValue('/resources/books')
    render(<ResourceNavItem href="/resources/books" label="Books" tab />)
    expect(screen.getByRole('link', { name: 'Books' })).toHaveAttribute('aria-current', 'page')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run components/resources
```
Expected: FAIL — `Cannot find module '../ResourceNavItem'`.

- [ ] **Step 3: Create `components/resources/ResourceNavItem.tsx`**

```tsx
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface ResourceNavItemProps {
  href: string
  label: string
  tab?: boolean
}

export function ResourceNavItem({ href, label, tab = false }: ResourceNavItemProps) {
  const pathname = usePathname()
  const isActive = pathname === href

  if (tab) {
    return (
      <Link
        href={href}
        aria-current={isActive ? 'page' : undefined}
        className="flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors"
        style={
          isActive
            ? { background: 'rgba(245,158,11,0.15)', color: 'var(--color-accent)' }
            : { color: 'var(--color-text-muted)' }
        }
      >
        {label}
      </Link>
    )
  }

  return (
    <Link
      href={href}
      aria-current={isActive ? 'page' : undefined}
      className="block rounded-r-md py-2 pr-3 text-sm font-medium transition-colors"
      style={
        isActive
          ? {
              color: 'var(--color-accent)',
              borderLeft: '2px solid var(--color-accent)',
              paddingLeft: '10px',
              background: 'rgba(245,158,11,0.08)',
            }
          : {
              color: 'var(--color-text-muted)',
              borderLeft: '2px solid transparent',
              paddingLeft: '10px',
            }
      }
    >
      {label}
    </Link>
  )
}
```

- [ ] **Step 4: Run component tests**

```bash
npx vitest run components/resources
```
Expected: 4 tests PASS.

- [ ] **Step 5: Run full test suite**

```bash
npx vitest run
```
Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add components/resources/ResourceNavItem.tsx \
        components/resources/__tests__/ResourceNavItem.test.tsx
git commit -m "feat: add ResourceNavItem client component with active-state detection"
```

---

### Task 4: `app/resources/layout.tsx`

**Files:**
- Create: `app/resources/layout.tsx`

Server component. No DB call — `TYPE_CONFIG` is static. The mobile tab strip (`md:hidden`) sits above the content; the desktop side nav (`hidden md:block`) sits beside it in a flex row.

- [ ] **Step 1: Create `app/resources/layout.tsx`**

```tsx
import { TYPE_CONFIG } from './type-config'
import { ResourceNavItem } from '@/components/resources/ResourceNavItem'

export default function ResourcesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--color-bg-base)', minHeight: '100vh' }}>
      <div
        className="mx-auto px-6 pb-20 pt-16"
        style={{ maxWidth: 'var(--container-width)' }}
      >
        <header className="mb-10">
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
              fontWeight: 600,
              letterSpacing: '-0.02em',
              color: 'var(--color-text-primary)',
              marginBottom: 8,
            }}
          >
            Resources
          </h1>
          <p style={{ color: 'var(--color-text-muted)' }}>
            Things I keep coming back to. No affiliate links. No filler.
          </p>
        </header>

        {/* Mobile: horizontal scrollable tab strip */}
        <nav
          className="mb-8 flex gap-1 overflow-x-auto md:hidden"
          aria-label="Resource types"
        >
          {TYPE_CONFIG.map(t => (
            <ResourceNavItem
              key={t.slug}
              href={`/resources/${t.slug}`}
              label={t.label}
              tab
            />
          ))}
        </nav>

        {/* Desktop: side nav + main content */}
        <div className="flex gap-10">
          <nav
            className="hidden w-44 flex-shrink-0 md:block"
            aria-label="Resource types"
          >
            <div className="flex flex-col gap-0.5">
              {TYPE_CONFIG.map(t => (
                <ResourceNavItem
                  key={t.slug}
                  href={`/resources/${t.slug}`}
                  label={t.label}
                />
              ))}
            </div>
          </nav>
          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Run tests**

```bash
npx vitest run
```
Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add app/resources/layout.tsx
git commit -m "feat: add resources layout with side nav and mobile tab strip"
```

---

### Task 5: `app/resources/[type]/page.tsx`

**Files:**
- Create: `app/resources/[type]/page.tsx`

The directory `app/resources/[type]/` does not exist yet — create it. In Next.js 15, `params` is a `Promise` — always `await` it before use.

- [ ] **Step 1: Create `app/resources/[type]/page.tsx`**

```tsx
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { getResourcesByType } from '@/lib/db/resources'
import { TYPE_CONFIG } from '../type-config'

export const revalidate = 86400

export async function generateStaticParams() {
  return TYPE_CONFIG.map(t => ({ type: t.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ type: string }>
}): Promise<Metadata> {
  const { type } = await params
  const config = TYPE_CONFIG.find(t => t.slug === type)
  return { title: config?.label ?? 'Resources' }
}

export default async function ResourceTypePage({
  params,
}: {
  params: Promise<{ type: string }>
}) {
  const { type } = await params
  const config = TYPE_CONFIG.find(t => t.slug === type)
  if (!config) notFound()

  const resources = await getResourcesByType(config.dbType)

  return (
    <div>
      <h2
        className="mb-6 pb-2 text-lg font-bold"
        style={{
          fontFamily: 'var(--font-display)',
          color: 'var(--color-text-primary)',
          borderBottom: '1px solid var(--color-accent)',
        }}
      >
        {config.label}
      </h2>

      {resources.length === 0 ? (
        <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>
          No resources of this type yet.
        </p>
      ) : (
        <ul className="space-y-6">
          {resources.map(item => (
            <li key={item.id}>
              <Link
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mb-1 block text-sm font-semibold hover:opacity-80"
                style={{ color: 'var(--color-text-primary)' }}
              >
                {item.title}
                {item.author && ` — ${item.author}`}{' '}
                <span style={{ color: 'var(--color-accent)' }}>↗</span>
              </Link>
              <p
                className="text-sm leading-relaxed"
                style={{ color: 'var(--color-text-muted)' }}
              >
                {item.description}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Run tests**

```bash
npx vitest run
```
Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add "app/resources/[type]/page.tsx"
git commit -m "feat: add ISR resource type page with generateStaticParams"
```

---

### Task 6: Replace `app/resources/page.tsx` with redirect

**Files:**
- Modify: `app/resources/page.tsx`

Replace the entire existing file. The old content (header, grid, byType grouping) now lives in `layout.tsx` and `[type]/page.tsx`.

- [ ] **Step 1: Replace `app/resources/page.tsx` entirely**

```tsx
import { redirect } from 'next/navigation'

export default function ResourcesPage() {
  redirect('/resources/books')
}
```

- [ ] **Step 2: Run tests**

```bash
npx vitest run
```
Expected: all tests pass.

- [ ] **Step 3: Verify manually**

Start the dev server:
```bash
npm run dev
```

Check the following in a browser:
- `http://localhost:3000/resources` → redirects to `/resources/books`
- `http://localhost:3000/resources/books` → Books heading, list, active "Books" in side nav
- `http://localhost:3000/resources/articles` → Articles heading, "Articles" active in side nav, "Books" inactive
- `http://localhost:3000/resources/people` → "People worth following" heading
- `http://localhost:3000/resources/nonexistent` → 404 page
- Narrow the browser to mobile width → tab strip visible above content, side nav hidden

- [ ] **Step 4: Commit**

```bash
git add app/resources/page.tsx
git commit -m "feat: redirect /resources to /resources/books"
```
