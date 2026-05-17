# Logo Prominence

**Date:** 2026-05-17
**Branch:** feat/dashboard-redesign

## Goal

Make the Brilliant Managers logo mark more prominent across the site by moving it into the top nav bar (the persistent `Nav` component visible on all pages), and clean up the resulting duplication in the app sidebar. Also wire up "The Tool" nav link to redirect authenticated users to `/dashboard`.

## Decisions Made

| Question | Decision |
|---|---|
| Logo placement | Top nav bar (left of brand name), not sidebar |
| Logo size | 36 px — prominent, fills most of the 56 px bar height |
| Homepage extra visual | None — the nav logo is the visual connection |
| Sidebar logo | Removed entirely — nav items start from the top |
| "The Tool" when authenticated | Redirects to `/dashboard` |
| Auth detection for redirect | `isAuthenticated` prop on Nav, checked server-side in root layout |

## Changes

### `app/layout.tsx`

Add a Supabase server-side auth check. Pass `isAuthenticated` (boolean) to `<Nav />`.

```tsx
const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()
// ...
<Nav isAuthenticated={!!user} />
```

This is a server component — no client-side flash, no extra round-trip.

### `components/layout/nav.tsx`

Three changes:

1. **Import LogoMark** — `import { LogoMark } from '@/components/app/LogoMark'`

2. **Add logo to brand link** — add `flex items-center gap-2.5` to the brand `<Link href="/">`'s `className`, then prepend `<LogoMark size={36} />` before the "Brilliant Managers" text.

3. **Accept and use `isAuthenticated` prop** — when `isAuthenticated` is true, "The Tool" nav link's `href` becomes `/dashboard` instead of `/the-tool`. All other nav links are unaffected.

```tsx
export function Nav({ isAuthenticated }: { isAuthenticated: boolean }) {
  // ...
  // In the nav link map:
  const href = item.href === '/the-tool' && isAuthenticated ? '/dashboard' : item.href
```

### `components/app/Sidebar.tsx`

Remove the logo/brand section entirely — the `<div>` containing `<LogoMark size={32} />` and the "Brilliant Managers" `<span>`, including both the expanded and collapsed conditional renders. The `marginBottom: 12` spacer on that block is removed too.

Nav items (`NAV_ITEMS.map(...)`) become the first rendered children of the sidebar.

Remove the `LogoMark` import from `Sidebar.tsx` — it will be unused.

## Files Changed

| File | Change |
|---|---|
| `app/layout.tsx` | Add Supabase auth check; pass `isAuthenticated` to Nav |
| `components/layout/nav.tsx` | Add LogoMark (36 px); accept isAuthenticated prop; conditional Tool href |
| `components/app/Sidebar.tsx` | Remove logo/brand block from top; remove LogoMark import |

## Out of Scope

- Mobile nav / hamburger menu
- Sidebar expanded/collapsed behaviour (unchanged)
- Any other nav link redirect logic
- Homepage hero section (no visual changes there)
