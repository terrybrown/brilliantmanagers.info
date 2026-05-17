# Resources Page Redesign — Design Spec

## Goal

Replace the current single-page resources view with a nested-route layout that has a side nav per resource type, clean deep-linkable URLs (`/resources/books`, `/resources/articles`, etc.), and ISR-based caching so the DB is only queried once per day rather than on every request.

---

## Scope

- `app/resources/page.tsx` — redirect to `/resources/books`
- `app/resources/layout.tsx` — new; side nav + `{children}`
- `app/resources/[type]/page.tsx` — new; replaces current page logic
- `lib/db/resources.ts` — add `getResourcesByType`

Out of scope:
- Revalidation API endpoint (ISR daily rebuild is sufficient)
- Resource counts in the side nav
- Any changes to the resource data model or seeding script

---

## URL Design

Slugs are plural; they map to the DB's singular `resource_type` via a shared lookup table.

| URL slug | DB `resource_type` | Label |
|----------|--------------------|-------|
| `books` | `book` | Books |
| `articles` | `article` | Articles |
| `courses` | `course` | Courses |
| `videos` | `video` | Videos |
| `people` | `person` | People worth following |
| `podcasts` | `podcast` | Podcasts |
| `tools` | `tool` | Tools & assessments |

The lookup table `TYPE_CONFIG` is defined once in `app/resources/type-config.ts` and imported by the layout, the `[type]` page, and `generateStaticParams`. It is an array (not a record) so order is preserved.

```ts
// app/resources/type-config.ts
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

---

## Routing

### `app/resources/page.tsx`

Server component. Calls `redirect('/resources/books')` from `next/navigation`. No data fetch.

### `app/resources/layout.tsx`

Server component. Renders the page chrome (header + side nav) and `{children}`. No DB call — the nav is built from `TYPE_CONFIG`.

**Desktop layout:** Two columns. Left: side nav (fixed width ~180px). Right: `{children}`.

**Mobile layout:** Side nav collapses to a horizontally scrollable tab row above the content area. Same `<Link>` elements, smaller font, no left border accent.

**Side nav item styles:**
- Inactive: muted text, no border
- Active (pathname matches): amber text (`var(--color-accent)`), left border 2px amber
- `usePathname()` determines the active item — layout is a client component for this reason, or active detection is done via a small `NavItem` client wrapper that reads `usePathname()`

### `app/resources/[type]/page.tsx`

Server component.

```ts
export const revalidate = 86400  // ISR: rebuild from DB at most once per 24 hours
```

`generateStaticParams` returns all 7 slugs:

```ts
export async function generateStaticParams() {
  return TYPE_CONFIG.map(t => ({ type: t.slug }))
}
```

On render:
1. Await `params: Promise<{ type: string }>` (Next.js 15 async params)
2. Look up `slug` in `TYPE_CONFIG` — if not found, call `notFound()`
3. Call `getResourcesByType(config.dbType)`
4. Render single-column list

**Resource list layout:** Single column (no grid). Each item:
- Title as external link (`target="_blank" rel="noopener noreferrer"`), with author appended if present (`— Author Name`), amber `↗` icon
- Description below in muted text
- Same visual style as the current page

**Empty state:** "No resources of this type yet." (soft muted text)

---

## DB Helper

Add to `lib/db/resources.ts`:

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

`getAllResources` is retained unchanged.

---

## Caching

`export const revalidate = 86400` on `[type]/page.tsx` opts each route segment into ISR. On first deploy, `generateStaticParams` causes Next.js to pre-render all 7 pages. Every subsequent request within the 24-hour window is served from the static HTML cache — zero DB calls. After 24 hours, the next request triggers a background revalidation.

The layout has no data fetch, so it has no revalidation concern.

---

## Active Nav Detection

The layout must highlight the active type. Because `usePathname()` is a client hook, the layout itself cannot be a pure server component and use it. Two options:

**Chosen approach:** `app/resources/layout.tsx` is a server component. It renders a small `ResourceNavItem` client component per nav entry that calls `usePathname()` internally and applies active styles. This keeps the layout server-side while allowing per-item active detection.

```tsx
// components/resources/ResourceNavItem.tsx — 'use client'
// Accepts href, label. Reads usePathname() and applies active styles.
```

---

## No changes to

- `/resources` public nav link (already present in `siteConfig.nav`)
- `getResourcesForSkill` (used in goal detail)
- `getAllResources` (used in goal detail browse-all section)
- Resource data model or RLS policies
