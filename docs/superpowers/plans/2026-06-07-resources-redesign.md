# Resources Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the Resources section: horizontal filter pills replacing the left sidebar, two-column card grid, client-side search, and two new DB columns (`subtitle`, `topic`) on the `resources` table.

**Architecture:** The route structure (`/resources/[type]`) is unchanged — deep links work. `ResourceTypePills` is a new client component (needs `usePathname`) rendering all filter pills. `ResourceCard` is a new shared card component. `ResourceSearch` wraps the card grid with client-side text filtering. `app/resources/layout.tsx` is simplified (header + pills, no sidebar). `app/resources/page.tsx` no longer redirects — it fetches all resources. The DB migration adds `subtitle TEXT` and `topic TEXT` nullable columns.

**Tech Stack:** Next.js App Router, Supabase, Sage CSS tokens, Lucide icons, Vitest.

---

## File map

| File | Action |
|---|---|
| `supabase/migrations/YYYYMMDD000001_resources_subtitle_topic.sql` | Create — add subtitle and topic columns |
| `lib/db/resources.ts` | Modify — add subtitle/topic to Resource interface |
| `components/resources/ResourceTypePills.tsx` | Create — client pill nav |
| `components/resources/ResourceCard.tsx` | Create — card component |
| `components/resources/ResourceSearch.tsx` | Create — client search + grid wrapper |
| `app/resources/layout.tsx` | Modify — remove sidebar, add pills |
| `app/resources/page.tsx` | Modify — remove redirect, fetch all, render grid |
| `app/resources/[type]/page.tsx` | Modify — swap list for card grid |
| `components/resources/ResourceNavItem.tsx` | Delete — replaced by ResourceTypePills |
| `__tests__/components/resources/ResourceCard.test.tsx` | Create |
| `__tests__/components/resources/ResourceSearch.test.tsx` | Create |

---

### Task 1: Database migration

**Files:**
- Create: `supabase/migrations/` (filename with today's timestamp)

- [ ] **Create the migration file**

Get the current timestamp for the filename:
```bash
date +%Y%m%d%H%M%S
```

Create `supabase/migrations/<TIMESTAMP>_resources_subtitle_topic.sql`:

```sql
ALTER TABLE resources ADD COLUMN IF NOT EXISTS subtitle TEXT;
ALTER TABLE resources ADD COLUMN IF NOT EXISTS topic TEXT;
```

- [ ] **Update `lib/db/resources.ts` — add fields to interface**

Find the `Resource` interface and add two lines:

```typescript
export interface Resource {
  id: string
  title: string
  subtitle: string | null   // ← add
  url: string
  description: string
  resource_type: 'book' | 'article' | 'course' | 'video' | 'person' | 'podcast' | 'tool'
  author: string | null
  topic: string | null      // ← add
  created_at: string
  updated_at: string
}
```

- [ ] **Run tests — confirm nothing breaks**

```bash
cd /Users/terry.brown/work/personal/brilliantmanagers.info && npm test 2>&1 | tail -6
```

- [ ] **Commit**

```bash
git add supabase/migrations/ lib/db/resources.ts
git commit -m "feat: add subtitle and topic columns to resources table"
```

---

### Task 2: Create `ResourceCard` component with tests

**Files:**
- Create: `components/resources/ResourceCard.tsx`
- Create: `__tests__/components/resources/ResourceCard.test.tsx`

- [ ] **Write failing tests**

Create `__tests__/components/resources/ResourceCard.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ResourceCard } from '@/components/resources/ResourceCard'
import type { Resource } from '@/lib/db/resources'

const BASE: Resource = {
  id: '1',
  title: 'Black Box Thinking',
  subtitle: 'Why Most People Never Learn from Their Mistakes',
  url: 'https://example.com',
  description: 'A compelling case for learning from failure.',
  resource_type: 'book',
  author: 'Matthew Syed',
  topic: 'Self',
  created_at: '2024-01-01',
  updated_at: '2024-01-01',
}

// Mock clipboard API
Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } })

describe('ResourceCard', () => {
  it('renders the title', () => {
    render(<ResourceCard resource={BASE} />)
    expect(screen.getByText('Black Box Thinking')).toBeTruthy()
  })

  it('renders the subtitle when present', () => {
    render(<ResourceCard resource={BASE} />)
    expect(screen.getByText('Why Most People Never Learn from Their Mistakes')).toBeTruthy()
  })

  it('renders the author when present', () => {
    render(<ResourceCard resource={BASE} />)
    expect(screen.getByText('Matthew Syed')).toBeTruthy()
  })

  it('renders the description', () => {
    render(<ResourceCard resource={BASE} />)
    expect(screen.getByText('A compelling case for learning from failure.')).toBeTruthy()
  })

  it('renders the type badge', () => {
    render(<ResourceCard resource={BASE} />)
    expect(screen.getByText('BOOK')).toBeTruthy()
  })

  it('renders the topic tag when present', () => {
    render(<ResourceCard resource={BASE} />)
    expect(screen.getByText('· Self')).toBeTruthy()
  })

  it('does not render subtitle when null', () => {
    render(<ResourceCard resource={{ ...BASE, subtitle: null }} />)
    expect(screen.queryByText('Why Most People Never Learn from Their Mistakes')).toBeNull()
  })

  it('does not render author when null', () => {
    render(<ResourceCard resource={{ ...BASE, author: null }} />)
    expect(screen.queryByText('Matthew Syed')).toBeNull()
  })

  it('does not render topic when null', () => {
    render(<ResourceCard resource={{ ...BASE, topic: null }} />)
    expect(screen.queryByText(/· /)).toBeNull()
  })
})
```

- [ ] **Run — expect FAIL**

```bash
npm test -- ResourceCard 2>&1 | tail -10
```

- [ ] **Create `components/resources/ResourceCard.tsx`**

```tsx
'use client'

import { BookOpen, FileText, GraduationCap, Play, User, Mic, Wrench, Link2 } from 'lucide-react'
import { toast } from 'sonner'
import type { Resource } from '@/lib/db/resources'

const TYPE_ICONS: Record<Resource['resource_type'], React.ElementType> = {
  book: BookOpen,
  article: FileText,
  course: GraduationCap,
  video: Play,
  person: User,
  podcast: Mic,
  tool: Wrench,
}

interface Props {
  resource: Resource
}

export function ResourceCard({ resource }: Props) {
  const Icon = TYPE_ICONS[resource.resource_type]

  function handleCopyLink() {
    navigator.clipboard.writeText(resource.url).then(() => {
      toast.success('Link copied')
    })
  }

  return (
    <div
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        boxShadow: '0 1px 2px rgba(40,60,45,.04), 0 2px 5px rgba(40,60,45,.03)',
        borderRadius: 'var(--radius-lg)',
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Top row: type badge + topic + copy link */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            background: 'var(--color-chip-bg)',
            color: 'var(--color-text-muted)',
            borderRadius: 4,
            padding: '2px 7px',
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.06em',
          }}
        >
          <Icon size={11} />
          {resource.resource_type.toUpperCase()}
        </span>
        {resource.topic && (
          <span style={{ fontSize: 12, color: 'var(--color-text-faint)' }}>
            · {resource.topic}
          </span>
        )}
        <button
          onClick={handleCopyLink}
          title="Copy link"
          style={{
            marginLeft: 'auto',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--color-text-faint)',
            padding: 2,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <Link2 size={13} />
        </button>
      </div>

      {/* Title */}
      <a
        href={resource.url}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 15,
          fontWeight: 700,
          color: 'var(--color-text-primary)',
          textDecoration: 'none',
          marginBottom: 2,
          lineHeight: 1.3,
        }}
      >
        {resource.title}
      </a>

      {/* Subtitle */}
      {resource.subtitle && (
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: '0 0 2px', lineHeight: 1.4 }}>
          {resource.subtitle}
        </p>
      )}

      {/* Author */}
      {resource.author && (
        <p style={{ fontSize: 12, color: 'var(--color-accent)', margin: '0 0 10px' }}>
          {resource.author}
        </p>
      )}

      {/* Description */}
      <p style={{ fontSize: 13.5, lineHeight: 1.6, color: 'var(--color-text-muted)', margin: 0, flex: 1 }}>
        {resource.description}
      </p>
    </div>
  )
}
```

- [ ] **Run tests — expect all PASS**

```bash
npm test -- ResourceCard 2>&1 | tail -10
```

- [ ] **Commit**

```bash
git add components/resources/ResourceCard.tsx __tests__/components/resources/ResourceCard.test.tsx
git commit -m "feat: ResourceCard component — type badge, topic tag, copy link, Sage styled"
```

---

### Task 3: Create `ResourceTypePills` and `ResourceSearch` components

**Files:**
- Create: `components/resources/ResourceTypePills.tsx`
- Create: `components/resources/ResourceSearch.tsx`
- Create: `__tests__/components/resources/ResourceSearch.test.tsx`

- [ ] **Write failing tests for ResourceSearch**

Create `__tests__/components/resources/ResourceSearch.test.tsx`:

```typescript
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ResourceSearch } from '@/components/resources/ResourceSearch'
import type { Resource } from '@/lib/db/resources'

const makeResource = (overrides: Partial<Resource>): Resource => ({
  id: '1',
  title: 'Default Title',
  subtitle: null,
  url: 'https://example.com',
  description: 'Default description',
  resource_type: 'book',
  author: null,
  topic: null,
  created_at: '2024-01-01',
  updated_at: '2024-01-01',
  ...overrides,
})

const RESOURCES: Resource[] = [
  makeResource({ id: '1', title: 'Black Box Thinking', author: 'Matthew Syed', description: 'About failure' }),
  makeResource({ id: '2', title: 'Co-Active Coaching', author: 'Kimsey-House', description: 'About coaching' }),
  makeResource({ id: '3', title: 'Radical Candor', author: 'Kim Scott', description: 'About feedback' }),
]

describe('ResourceSearch', () => {
  it('renders all resources when search is empty', () => {
    render(<ResourceSearch resources={RESOURCES} />)
    expect(screen.getByText('Black Box Thinking')).toBeTruthy()
    expect(screen.getByText('Co-Active Coaching')).toBeTruthy()
    expect(screen.getByText('Radical Candor')).toBeTruthy()
  })

  it('filters by title', () => {
    render(<ResourceSearch resources={RESOURCES} />)
    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: 'Black' } })
    expect(screen.getByText('Black Box Thinking')).toBeTruthy()
    expect(screen.queryByText('Co-Active Coaching')).toBeNull()
  })

  it('filters by author', () => {
    render(<ResourceSearch resources={RESOURCES} />)
    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: 'Kim Scott' } })
    expect(screen.getByText('Radical Candor')).toBeTruthy()
    expect(screen.queryByText('Black Box Thinking')).toBeNull()
  })

  it('filters by description', () => {
    render(<ResourceSearch resources={RESOURCES} />)
    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: 'coaching' } })
    expect(screen.getByText('Co-Active Coaching')).toBeTruthy()
    expect(screen.queryByText('Radical Candor')).toBeNull()
  })

  it('is case-insensitive', () => {
    render(<ResourceSearch resources={RESOURCES} />)
    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: 'BLACK' } })
    expect(screen.getByText('Black Box Thinking')).toBeTruthy()
  })

  it('shows no results message when nothing matches', () => {
    render(<ResourceSearch resources={RESOURCES} />)
    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: 'zzznomatch' } })
    expect(screen.getByText(/no resources match/i)).toBeTruthy()
  })
})
```

- [ ] **Run — expect FAIL**

```bash
npm test -- ResourceSearch 2>&1 | tail -10
```

- [ ] **Create `components/resources/ResourceTypePills.tsx`**

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { TYPE_CONFIG } from '@/app/resources/type-config'

export function ResourceTypePills() {
  const pathname = usePathname()

  const pills = [
    { href: '/resources', label: 'All' },
    ...TYPE_CONFIG.map(t => ({ href: `/resources/${t.slug}`, label: t.label })),
  ]

  return (
    <div
      style={{
        display: 'flex',
        gap: 6,
        flexWrap: 'wrap',
        alignItems: 'center',
      }}
    >
      {pills.map(pill => {
        const isActive = pill.href === '/resources'
          ? pathname === '/resources'
          : pathname === pill.href
        return (
          <Link
            key={pill.href}
            href={pill.href}
            style={
              isActive
                ? {
                    background: 'var(--color-accent)',
                    color: '#fff',
                    border: '1px solid var(--color-accent)',
                    borderRadius: 20,
                    padding: '5px 14px',
                    fontSize: 13,
                    fontWeight: 600,
                    textDecoration: 'none',
                    whiteSpace: 'nowrap',
                  }
                : {
                    background: 'transparent',
                    color: 'var(--color-text-muted)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 20,
                    padding: '5px 14px',
                    fontSize: 13,
                    fontWeight: 500,
                    textDecoration: 'none',
                    whiteSpace: 'nowrap',
                  }
            }
          >
            {pill.label}
          </Link>
        )
      })}
    </div>
  )
}
```

- [ ] **Create `components/resources/ResourceSearch.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { Search } from 'lucide-react'
import { ResourceCard } from './ResourceCard'
import type { Resource } from '@/lib/db/resources'

interface Props {
  resources: Resource[]
}

export function ResourceSearch({ resources }: Props) {
  const [query, setQuery] = useState('')

  const filtered = query.trim()
    ? resources.filter(r => {
        const q = query.toLowerCase()
        return (
          r.title.toLowerCase().includes(q) ||
          (r.subtitle ?? '').toLowerCase().includes(q) ||
          (r.author ?? '').toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q)
        )
      })
    : resources

  return (
    <div>
      {/* Search bar */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'flex-end' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'var(--color-bg-base)',
            border: '1px solid var(--color-border)',
            borderRadius: 8,
            padding: '6px 12px',
            width: 220,
          }}
        >
          <Search size={13} style={{ color: 'var(--color-text-faint)', flexShrink: 0 }} />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search resources"
            style={{
              border: 'none',
              background: 'transparent',
              outline: 'none',
              fontSize: 13,
              color: 'var(--color-text-primary)',
              width: '100%',
            }}
          />
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>
          No resources match &ldquo;{query}&rdquo;.
        </p>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2">
          {filtered.map(resource => (
            <ResourceCard key={resource.id} resource={resource} />
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Run tests — expect all PASS**

```bash
npm test -- ResourceSearch 2>&1 | tail -10
```

- [ ] **Run full suite**

```bash
npm test 2>&1 | tail -6
```

- [ ] **Commit**

```bash
git add components/resources/ResourceTypePills.tsx components/resources/ResourceSearch.tsx __tests__/components/resources/ResourceSearch.test.tsx
git commit -m "feat: ResourceTypePills (pill nav) and ResourceSearch (client filter + grid)"
```

---

### Task 4: Update layout, all-resources page, and per-type page

**Files:**
- Modify: `app/resources/layout.tsx`
- Modify: `app/resources/page.tsx`
- Modify: `app/resources/[type]/page.tsx`
- Delete: `components/resources/ResourceNavItem.tsx`

- [ ] **Rewrite `app/resources/layout.tsx`**

```tsx
import { ResourceTypePills } from '@/components/resources/ResourceTypePills'

export default function ResourcesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--color-bg-base)', minHeight: '100vh' }}>
      <div
        className="mx-auto px-6 pb-20 pt-16"
        style={{ maxWidth: 'var(--container-width)' }}
      >
        <header style={{ marginBottom: 24 }}>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2rem, 5vw, 3rem)',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              color: 'var(--color-text-primary)',
              marginBottom: 8,
            }}
          >
            Resources
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 14, marginBottom: 20 }}>
            Things I keep coming back to. No affiliate links. No filler.
          </p>
          <ResourceTypePills />
        </header>

        <div style={{ marginTop: 28 }}>{children}</div>
      </div>
    </div>
  )
}
```

- [ ] **Rewrite `app/resources/page.tsx`**

```tsx
import { getAllResources } from '@/lib/db/resources'
import { ResourceSearch } from '@/components/resources/ResourceSearch'

export const metadata = { title: 'Resources' }
export const revalidate = 86400

export default async function ResourcesPage() {
  const resources = await getAllResources()
  return <ResourceSearch resources={resources} />
}
```

- [ ] **Rewrite `app/resources/[type]/page.tsx`**

```tsx
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getResourcesByType } from '@/lib/db/resources'
import { TYPE_CONFIG } from '../type-config'
import { ResourceSearch } from '@/components/resources/ResourceSearch'

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
  return <ResourceSearch resources={resources} />
}
```

- [ ] **Delete `ResourceNavItem.tsx`**

```bash
rm components/resources/ResourceNavItem.tsx
```

- [ ] **Verify no remaining imports of ResourceNavItem**

```bash
grep -rn "ResourceNavItem" --include="*.tsx" --include="*.ts" . | grep -v node_modules | grep -v .next
```

Expected: no output.

- [ ] **Run full test suite and build**

```bash
npm test 2>&1 | tail -6 && npm run build 2>&1 | grep -E "error TS|Type error|✓ Compiled|Failed" | head -5
```

Expected: all tests pass, `✓ Compiled successfully`.

- [ ] **Commit**

```bash
git add app/resources/layout.tsx app/resources/page.tsx 'app/resources/[type]/page.tsx'
git add -A components/resources/
git commit -m "feat: resources — horizontal pills, two-column card grid, client search, all-resources page"
```

---

### Final: push and open PR

```bash
git push -u origin design/resources-redesign
gh pr create \
  --title "feat: Resources page redesign — horizontal pills, card grid, search" \
  --body "Replaces the left-sidebar layout with horizontal filter pills (ResourceTypePills). Adds a two-column card grid (ResourceCard) with type badge, topic tag, and copy-link button. Adds client-side search (ResourceSearch) filtering by title, subtitle, author, and description. The /resources route now shows all resources instead of redirecting. Deep links (/resources/books etc.) still work — the route structure is unchanged. DB migration adds nullable subtitle and topic columns to the resources table." \
  --base master --assignee "@me"
```
