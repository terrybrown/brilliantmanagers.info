# Dashboard Redesign — Design Spec

## Goal

Make the dashboard the single home for all Brilliant Managers activity: full-width layout, Mission Control three-column design, radar chart and pillar drill-down merged from the Results page, opportunity/goal skill chips, and a scheduling widget for planning the next reflection round. The separate Results page is retired. Scorecard is removed from the nav and accessed via dashboard CTAs only.

## Architecture

The AppShell `main` area currently pads to 24px each side but all page content is constrained to `max-w-2xl` (672px). This spec removes that constraint everywhere — pages use the full available width. The dashboard itself adopts a fixed three-column grid; other pages (Growth, Profile, etc.) adopt a comfortable `max-w-5xl` cap so they don't stretch uncomfortably on ultra-wide screens.

The `scheduled_rounds` table is new. Everything else (scores, rounds, manager scores, development plans) is read-only from the dashboard's perspective.

---

## Layout

### Content width

- Remove `mx-auto max-w-2xl` from all `(app)` pages.
- Dashboard: three-column grid (see below), no outer max-width.
- All other pages (`/growth`, `/organisation`, `/profile`, `/connections`, `/notifications`, `/scorecard`, `/manager/[userId]`): `mx-auto max-w-5xl` (1024px cap, comfortable on large screens without stretching).

### Dashboard three-column grid

```
┌──────────────┬──────────────────────────────┬──────────────────┐
│  Left · 220px│  Centre · flex-1             │  Right · 260px   │
│              │                              │                  │
│  Radar chart │  Pillar accordion            │  Next reflection │
│  Overall     │  (always-on chips,           │  Growth summary  │
│  score chip  │   click to expand)           │  Manager invite  │
│  Round date  │                              │  (if needed)     │
└──────────────┴──────────────────────────────┴──────────────────┘
```

Columns are `display: grid; grid-template-columns: 220px 1fr 260px; gap: 24px`. On screens narrower than 900px the grid collapses to a single column (radar → pillars → actions, stacked).

---

## Navigation

### Sidebar items (in order)

| Icon | Label | Route |
|------|-------|-------|
| `LayoutDashboard` | Dashboard | `/dashboard` |
| `TrendingUp` | Growth | `/growth` |
| `Link2` | Connections | `/connections` |
| `Network` | Organisation | `/organisation` |

**Removed from nav:** Scorecard (`/scorecard`), Results (`/results`).

The `/scorecard` route still exists — it is reached only via CTAs on the dashboard. The `/results` route redirects to `/dashboard`.

---

## Dashboard — empty state (no complete round)

Shown when the user has no completed reflection round.

- Heading: "Welcome to Brilliant Managers"
- Sub-text: "Your dashboard will come alive once you've completed your first self-assessment."
- Primary CTA button: "Start your scorecard →" → `/scorecard`

---

## Dashboard — populated state

### Left column

**Radar chart**
- Reuses the existing `ScorecardRadarChart` component.
- If manager scores exist, shows a toggle ("Self / Manager") above the chart — same as the current Results page.
- Chart height: 200px.

**Overall score chip**
- Large amber number (e.g. "3.2"), label "Overall score", round date below ("Jun 2025").

**Trend chip** (shown if a prior complete round exists)
- Green upward arrow and delta if improved ("+0.4 ↑"), amber downward if declined.

### Centre column — Pillar accordion

All five pillars are always visible. Each pillar shows a header row (name, score bar, score value) and a row of skill chips below it.

**Skill chip types:**

| Type | Icon | Colour | Meaning |
|------|------|--------|---------|
| Opportunity | `Lightbulb` (Lucide, strokeWidth 1.75) | Indigo — `bg: rgba(99,102,241,0.12)`, `border: rgba(99,102,241,0.35)`, `color: #a5b4fc` | Skill scored Basic or below, no active growth goal |
| Active goal | `Target` (Lucide, three concentric circles, strokeWidth 1.75) | Amber — `bg: rgba(245,158,11,0.12)`, `border: rgba(245,158,11,0.35)`, `color: #f59e0b` | Skill has an active development plan in Growth |

Skills scored Proficient or above with no goal show no chip (they don't need attention).

The lowest-scoring pillar gets an amber highlight on its card background (`#0f2040`, amber border) and a "↓ lowest" label.

**Expanded state (accordion open)**

Clicking a pillar header expands it (one open at a time). The expanded view shows two sections:

1. **Opportunities** (Lightbulb section header, indigo)
   - Each row: skill name + description, level badge, "Make goal →" button (indigo)
   - Clicking "Make goal" navigates to `/growth` with `?skill=<skill_key>` so Growth pre-opens the add-goal form for that skill.

2. **Active goals** (Target section header, amber)
   - Each row: skill name, goal text (truncated to one line), level badge, "In Growth →" tag (amber)
   - "In Growth →" links to `/growth`.

Other pillars remain visible in their collapsed (chips-only) state while one is expanded.

### Right column — Action cards

**Next reflection card**

States:
- *Not scheduled*: shows "Schedule your next reflection" heading, a date input, and a "Set date" button.
- *Scheduled*: shows the date, a countdown ("in 23 days"), an edit icon to change the date, a delete (×) icon to cancel, and two export links: "Add to Google Calendar" and "Download .ics".

The scheduled date is stored in the `scheduled_rounds` table (one active row per user — upsert on save, delete on cancel).

Google Calendar link format:
```
https://calendar.google.com/calendar/render?action=TEMPLATE
  &text=Brilliant+Managers+Reflection+Round
  &dates=<YYYYMMDD>/<YYYYMMDD+1>
  &details=Time+to+reflect+on+your+management+skills
```

ICS download: a Next.js API route at `GET /api/export-ical` returns a `.ics` file for the scheduled date. No authentication required beyond the session cookie. The file contains a single VEVENT for the scheduled date (all-day event).

**Growth summary card**

- Shows count of active goals ("3 active goals").
- Lists the top two goal skill names (by pillar order).
- "View all →" links to `/growth`.
- If no goals exist: "No growth goals yet" with a "Explore skills →" link to `/growth`.

**Manager feedback card** (shown only when no manager scores exist for the latest round)

- "Invite your manager" heading.
- "They score you independently, then you compare." sub-text.
- "Connect →" link to `/connections`.

---

## Data model

### New table: `scheduled_rounds`

```sql
create table public.scheduled_rounds (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  scheduled_date date not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (user_id)  -- one active scheduled round per user
);

alter table public.scheduled_rounds enable row level security;

create policy "Users manage own scheduled rounds"
  on public.scheduled_rounds
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

### DB helper: `lib/db/scheduled-rounds.ts`

```typescript
export interface ScheduledRound {
  id: string
  user_id: string
  scheduled_date: string   // ISO date 'YYYY-MM-DD'
  created_at: string
  updated_at: string
}

export async function getScheduledRound(userId: string): Promise<ScheduledRound | null>
export async function upsertScheduledRound(userId: string, date: string): Promise<ScheduledRound>
export async function deleteScheduledRound(userId: string): Promise<void>
```

### Server actions: `app/(app)/dashboard/actions.ts`

```typescript
export async function setScheduledRoundAction(formData: FormData): Promise<void>
export async function cancelScheduledRoundAction(): Promise<void>
```

Both revalidate `/dashboard` on success.

---

## Components

| Component | Type | Description |
|-----------|------|-------------|
| `components/app/PillarAccordion.tsx` | Client | Renders all 5 pillars with always-on chips, accordion expand, opportunity/goal sections. Accepts `pillarScores[]` + `plans[]`. |
| `components/app/SkillChip.tsx` | Client | Single chip — accepts `type: 'opportunity' \| 'goal'`, `label`. Renders correct icon and colour. |
| `components/app/ScheduleWidget.tsx` | Client | Date picker, countdown, calendar export links, edit/delete. Accepts `scheduled: ScheduledRound \| null`. Uses server actions via form submit. |
| `components/app/GrowthSummaryCard.tsx` | Server-compatible | Shows active plan count + top two skills. Accepts `plans: DevelopmentPlan[]`. |
| `app/(app)/dashboard/page.tsx` | Server | Fetches all data, computes pillar scores + opportunity/goal classification, renders three-column grid. |
| `app/(app)/dashboard/actions.ts` | Server actions | `setScheduledRoundAction`, `cancelScheduledRoundAction`. |
| `app/api/export-ical/route.ts` | API route | Returns `.ics` file for the user's scheduled round. Requires authenticated session. |

---

## Opportunity classification logic

A skill is an **opportunity** if:
1. The user has a complete round, AND
2. The skill's self-score is `'Needs Improvement'` or `'Basic'`, AND
3. There is no active (non-completed) `development_plan` for that `skill_key`.

A skill shows an **active goal** chip if there is an active `development_plan` for that `skill_key` (status `'planned'` or `'in_progress'`).

Skills scored `'Proficient'`, `'Advanced'`, or `'Expert'` with no goal show no chip.

---

## Results page retirement

`app/(app)/results/page.tsx` is replaced with a single redirect:

```typescript
import { redirect } from 'next/navigation'
export default function ResultsPage() {
  redirect('/dashboard')
}
```

Any inbound links to `/results` (e.g. from the scorecard "View results →" link) are updated to point to `/dashboard`.

---

## Scorecard CTA wiring

The `/scorecard` page is not in the nav but remains accessible. The dashboard surfaces it in two ways:

- **Empty state**: "Start your scorecard →" button.
- **Populated state**: A small "Start new round →" link in the right column below the schedule widget (only shown when the user has at least one complete round and no in-progress round).

---

## Out of scope (Spec 2)

- Email reminders (Mailgun, Netlify scheduled function, reminder preferences in Profile).
- `reminder_logs` table.
- The `scheduled_rounds` table is created in this spec but the `reminder_*` columns referenced in Spec 2 will be additive migrations.
