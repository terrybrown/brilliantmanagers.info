# Brilliant Managers — App Navigation Shell Design Spec

**Date:** 2026-05-16
**Status:** Approved, ready for implementation planning

---

## Overview

Replace the current authenticated app layout with a collapsible left-hand navigation shell that maximises on-screen real estate and gives the product a polished, app-like feel. The shell introduces five core sections, a brand logo mark, and a user avatar dropdown — all using the same Lucide icon visual language as the public guide.

The reference mockup is at:
`.superpowers/brainstorm/25012-1778966349/content/all-pages-v3.html`

---

## 1. Layout

### Shell structure

```
┌────────┬──────────────────────────────────┐
│ Sidebar│ Topbar                           │
│        ├──────────────────────────────────┤
│        │                                  │
│        │  Page content (scrollable)       │
│        │                                  │
└────────┴──────────────────────────────────┘
```

- **Sidebar**: fixed left column, collapses to 56px icon-rail or expands to 220px with labels. Transition: `width 0.2s ease`.
- **Topbar**: 52px fixed bar across the top of the main area. Shows current page title on the left and the avatar button on the right.
- **Content area**: `flex: 1`, `overflow-y: auto`, `padding: 24px`. Hosts the active page.

### Sidebar collapsed vs expanded

| State | Width | Shows |
|---|---|---|
| Collapsed (default) | 56px | Logo mark only · Icon-only nav items |
| Expanded | 220px | Logo mark + wordmark · Icon + label nav items |

Toggle control: a small circular chevron button (`‹ ›`) anchored to the right edge of the sidebar at vertical centre. Clicking toggles the state; state persists to `localStorage` key `bm_sidebar_expanded`.

### Colours (dark theme only for now)

| Token | Value |
|---|---|
| Shell background | `#0a0f1e` |
| Sidebar background | `#111827` |
| Sidebar border | `#1f2937` |
| Topbar background | `#0f172a` |
| Topbar border | `#1f2937` |
| Content background | `#0a0f1e` |
| Nav item default | `#64748b` |
| Nav item hover background | `#1f2937`, colour `#94a3b8` |
| Nav item active background | `rgba(245,158,11,0.12)`, colour `#f59e0b` |
| Accent | `#f59e0b` (amber) |

---

## 2. Logo Mark

The **A2 variant** of the Growth Trajectory concept — a smooth bezier curve with a filled area beneath, on an amber rounded-rectangle background.

```svg
<svg width="32" height="32" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="7" fill="#f59e0b"/>
  <!-- filled area under curve -->
  <path d="M5,24 C9,22 13,12 17,15 C21,18 23,7 27,6 L27,27 L5,27 Z"
        fill="#0f172a" opacity="0.25"/>
  <!-- curve line -->
  <path d="M5,24 C9,22 13,12 17,15 C21,18 23,7 27,6"
        fill="none" stroke="#0f172a" stroke-width="2.5" stroke-linecap="round"/>
  <!-- endpoint dot -->
  <circle cx="27" cy="6" r="2.5" fill="#0f172a"/>
</svg>
```

In collapsed sidebar: logo mark only (32×32px).
In expanded sidebar: logo mark + wordmark "Brilliant Managers" (13px, weight 700, `#f8fafc`, `letter-spacing: -0.3px`).

This SVG is the source of truth for favicon, app icon, and sidebar mark. It will be exported to `public/icon.svg`, `public/favicon.ico`, and `public/apple-touch-icon.png`.

---

## 3. Navigation Items

All icons use **Lucide** (`lucide-react`) with `strokeWidth={1.75}`, `size={18}`, `color="currentColor"` so they inherit the nav item's active/hover CSS colour automatically.

| Section | Route | Lucide Icon | Purpose |
|---|---|---|---|
| Dashboard | `/app/dashboard` | `LayoutDashboard` | Hub — recent scores, active plans, growth nudge |
| Scorecard | `/app/scorecard` | `ClipboardCheck` | Self-assessment — score each pillar per round |
| Results | `/app/results` | `BarChart3` | Radar chart + score trends over time |
| Organisation | `/app/organisation` | `Network` | Team hierarchy — direct reports, pending invites |
| Growth | `/app/growth` | `TrendingUp` | Skill deep-dives, personalised suggestions, development plans |

Navigation items are stacked vertically in the sidebar. A `flex: 1` spacer pushes nothing to the bottom (no bottom-anchored items in this phase; the toggle button is CSS-positioned).

---

## 4. Topbar

Left: page title (font-size 15px, weight 600) — updated dynamically as nav item changes.

Right (left to right):
- **Beta badge**: amber pill label `Beta` — visible in beta period only, controlled by env flag.
- **Avatar button**: 32×32px circle, amber border on hover, shows user's uploaded photo or initials fallback. Clicking opens the dropdown.

### Avatar dropdown

Positioned absolutely below the avatar button, 220px wide. Closes on outside click.

| Element | Detail |
|---|---|
| Header | User avatar (36px) + display name + email address |
| Profile & settings | `User` icon → navigates to `/app/profile` |
| Notifications | `Bell` icon → navigates to `/app/notifications` |
| Divider | — |
| Sign out | `LogOut` icon, red danger colour → calls `supabase.auth.signOut()` |

---

## 5. Pages (placeholder scope for this spec)

Each page listed below gets a **placeholder implementation** — real layout, real chrome, representative content, no functional backend beyond what already exists (scorecard, results). The goal is a fully navigable shell where future features slot in.

### 5.1 Dashboard

The post-login home. Shows:
- Greeting + next reflection round countdown
- 3-stat row: current round label, overall score, active plan count
- Two-column lower area:
  - Left: pillar score bars (progress bars per pillar with badge scores)
  - Right: Growth nudge card (lowest-scoring pillar + CTA to Growth section) + active plan list

When the user has no results yet, show a "Start your first reflection" empty state with a CTA to Scorecard.

### 5.2 Scorecard

List of pillars, each showing completion status for the current round (Not started / N of M scored / Complete). Tapping a pillar navigates into the existing scoring flow. No change to the scoring logic itself in this spec.

### 5.3 Results

Two tabs: Latest round · History.

- **Latest round**: radar chart (SVG pentagon, self vs manager overlay) + per-pillar score trend sparkbars.
- **History**: line chart of overall score across rounds (placeholder chart, real data wired later).

Uses the existing results page logic; this spec only changes the shell wrapping it.

### 5.4 Organisation

Placeholder — manager's team view. Shows:

- Direct reports list with avatar, name, role, and mini radar placeholder.
- "Invite a team member" button (disabled, labelled "Coming soon").
- Brief explainer: "Once your team joins, you'll see their aggregated scores here alongside your own."

No backend work in this phase. Static placeholder only.

### 5.5 Growth

Merged skill deep-dive + development plans (no separate Goals section).

Layout:
- Pillar pill filters across the top (Communication, Team, Self, Strategy, Domain).
- Grid of skill cards per pillar — each card shows skill name, current score if available, and a "Explore" button.
- Clicking a skill opens a right-hand detail panel: Definition, Why It Matters, Warning Signs, Pathways to Improvement (sourced from existing MDX content in old build — to be ported).
- Below the panel body: "Set a development plan" form — goal text, target date, status (Planned / In Progress / Completed). Plans are persisted to Supabase.

Personalised nudge: if the user has results, the two lowest-scoring skills surface first with a `💡 Suggested for you` badge.

### 5.6 Profile & Settings

Accessible from avatar dropdown. Shows:
- Photo upload circle (80px, dashed border on hover, `<input type="file" accept="image/*">` hidden behind it)
- Display name field
- Job title field
- Bio textarea
- Notification preference toggles (email summary, weekly nudge, in-app alerts)
- Save changes button

The photo upload UI control is shown (the dashed circle with an upload affordance) but the actual upload to Supabase Storage is **deferred** — clicking it does nothing in this phase. Other fields (`display_name`, `job_title`, `bio`) write to the `profiles` table. The existing table has `display_name` only; a migration must add `job_title text` and `bio text` columns. RLS policies already exist and cover these new columns without change.

### 5.7 Notifications (placeholder)

Simple placeholder: "Notification preferences can be managed from your Profile." CTA links to Profile page. No backend in this phase.

---

## 6. Implementation Notes

### Component structure

```
app/(app)/
  layout.tsx          ← AppShell (sidebar + topbar + slot)
  dashboard/page.tsx
  scorecard/page.tsx  ← existing, rewrapped
  results/page.tsx    ← existing, rewrapped
  organisation/page.tsx
  growth/page.tsx
  profile/page.tsx
  notifications/page.tsx

components/app/
  app-shell.tsx       ← client component (sidebar toggle state)
  sidebar.tsx
  topbar.tsx
  nav-item.tsx
  avatar-dropdown.tsx
  logo-mark.tsx       ← the A2 SVG as a React component
```

### Sidebar toggle state

`localStorage` key `bm_sidebar_expanded` (boolean string). Read on mount; default `false` (collapsed). The component is a client component (`'use client'`); the sidebar toggle button calls `useState` setter + writes to localStorage.

### Active nav item

Determined by `usePathname()` from `next/navigation`. Each `NavItem` compares its route to the current pathname.

### Icons

Import from `lucide-react`. The same package is already installed (used in `components/icons/guide-icons.tsx`).

### Existing pages

`scorecard` and `results` pages have existing logic. They get rewrapped inside the new shell layout; their internal components are unchanged.

### Schema migrations required

| Migration | Change |
|---|---|
| `profiles` | Add `job_title text`, `bio text` columns |
| `development_plans` (new table) | `id`, `user_id`, `skill_id`, `pillar`, `goal text`, `target_date date`, `status` (planned/in_progress/completed), `created_at` |

The `development_plans` table is new. Apply RLS immediately on creation: SELECT/INSERT/UPDATE/DELETE policies all gate on `auth.uid() = user_id` per CLAUDE.md rules.

---

## 7. Out of Scope (this spec)

- Real team/organisation backend (invites, aggregated scores)
- Notification delivery (email, push)
- History tab chart (wired data)
- Manager-view of direct report scores
- Actual photo upload to Supabase Storage (UI is shown; wiring is a follow-up spec)
- Light theme

---

## 8. Success Criteria

1. Authenticated user lands on Dashboard and can navigate all five sections without errors.
2. Sidebar collapses/expands smoothly; state persists across page reloads.
3. Active nav item is visually distinct (amber accent).
4. Avatar dropdown opens/closes correctly; Sign out works.
5. Growth page shows skill cards; clicking one opens the detail panel.
6. Profile page saves display name, job title, and bio to Supabase.
7. All pages are responsive down to 1024px width (minimum supported for app in this phase).
8. Existing scorecard and results functionality is unbroken.
