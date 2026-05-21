# Reflections Page Design

## Goal

Add a Reflections section to the left nav that gives users a home for round management, progress over time, and historical data. Update the dashboard to use a new, cleaner round card pattern that replaces the existing `ScheduleWidget`.

## Architecture

Three new routes, one shared modal, one shared card component, a DB migration, and a dashboard swap:

- **`/reflections`** — list page (server component): active round card → stats bar → trend chart → history table
- **`/reflections/[id]`** — round detail page (server component): reuses existing radar, pillar accordion, and score breakdown components from the dashboard, pointed at the selected round
- **`CreateRoundModal`** — shared client component: used by both the Reflections page and the Dashboard empty state
- **`ActiveRoundCard`** — shared server/client component: used by both the Reflections page and the Dashboard top-right; replaces `ScheduleWidget`
- **DB migration**: add `title`, `notes`, `remind_at` to `assessment_rounds`; backfill `title` from `created_at`
- **Sidebar**: add Reflections nav item between Growth and Team & Org

---

## Data Model Changes

### Migration: extend `assessment_rounds`

```sql
ALTER TABLE assessment_rounds
  ADD COLUMN title       TEXT,
  ADD COLUMN notes       TEXT,
  ADD COLUMN remind_at   DATE;

-- Backfill title from created_at as "QX YYYY"
UPDATE assessment_rounds
SET title = CONCAT('Q', EXTRACT(QUARTER FROM created_at), ' ', EXTRACT(YEAR FROM created_at));
```

No RLS changes needed — existing policies on `assessment_rounds` already gate on `auth.uid() = user_id`.

### Round creation flow change

Currently `/scorecard` calls `getOrCreateActiveRound`, which silently creates a round if none exists. This continues to work — the new `CreateRoundModal` inserts a round with `title`/`notes`/`remind_at` set; the scorecard flow inserts a round with all three as `null`. Both paths produce a valid in-progress round.

Add a new DB function `createRound(userId, title, notes?, remindAt?)` in `lib/db/rounds.ts` that explicitly inserts a round (no upsert logic).

### `lib/db/rounds.ts` additions

```ts
export async function createRound(
  userId: string,
  title: string,
  notes: string | null,
  remindAt: string | null
): Promise<Round>

export async function getRoundById(roundId: string, userId: string): Promise<Round | null>
```

---

## New Pages

### `/reflections` page

**Server component.** Fetches:
- `getInProgressRound(userId)` — for the active round card
- `getAllCompleteRoundsWithScores(userId)` — for stats, chart, and history table
- `getManagerScoresForAllRounds(userId)` — new DB function: manager scores grouped by round

**Layout (top to bottom):**

1. **Page header**: "Reflections" h1 + "+ New round" button (opens `CreateRoundModal`)

2. **Active round card** (`ActiveRoundCard`):
   - If in-progress round exists: amber card — round title, "X of 5 pillars scored", progress bar, "Continue →" link to `/scorecard`
   - If no in-progress round: dashed empty state — "Ready to reflect?" + "Start [next QX YYYY] →" button (opens `CreateRoundModal`)

3. **Stats bar** (4 cards, only shown if at least one complete round):
   - Total rounds completed
   - Overall improvement (latest complete score minus earliest complete score, shown as +/- with colour)
   - Best pillar (pillar with highest average across all rounds)
   - Manager avg (average of all manager overall scores, or "—" if none)

4. **Trend chart** (`ReflectionsTrendChart` — new client component):
   - Line chart: x-axis = rounds in chronological order, y-axis = 1–5
   - Default tab: Overall. Additional tabs: Self, Team, Strategy, Communications, Domain
   - Your scores: solid amber line with dots
   - Manager scores: dashed purple line with dots, only on rounds where manager scored
   - In-progress round: faded dot at current partial average (or omitted if 0 pillars scored)

5. **History table** (only shown if at least one complete round):
   - Columns: Round (title + date range), Your score, Manager score, Self, Team, Strategy, Comms, Domain, Trend (vs previous round), View
   - Clicking "View →" navigates to `/reflections/[id]`
   - Rows ordered newest first

### `/reflections/[id]` page

**Server component.** Fetches the specific round by ID (verifies `user_id` matches auth user), its scores, and manager scores for that round.

**Layout:**
- Breadcrumb: "← Reflections"
- Round title + date range (start = `created_at`, end = `completed_at`) + "Completed" or "In progress" badge
- Round intention (`notes` field), if set
- Radar chart: your shape (amber) + manager shape (dashed purple) overlaid — reuse `ScorecardRadarChart` component
- Pillar breakdown table: Pillar | Your score | Manager score | Gap | Level badge — reuse existing pillar data structures
- No new visualization components needed: wire the existing ones to the selected round's data

---

## Shared Components

### `ActiveRoundCard`

**Client component** — owns the `CreateRoundModal` open/close state internally.

**Props:**
```ts
interface ActiveRoundCardProps {
  inProgressRound: Round | null
  scoredPillarCount: number   // 0–5, from getScoresForRound on the server
  nextRoundTitle: string      // pre-computed on the server: "Q3 2026" from current date
}
```

`nextRoundTitle` computation: Q1 = Jan–Mar, Q2 = Apr–Jun, Q3 = Jul–Sep, Q4 = Oct–Dec, derived from `new Date()` on the server and passed down as a string. Amber card when active, dashed empty state when not. Used in both `/reflections` and the dashboard.

### `CreateRoundModal`

**Client component.** Fields:
- **Title** — text input, pre-filled with next `QX YYYY` (computed from current date)
- **Start date** — date input, defaults to today
- **Remind me by** — optional date input; if set, stored as `remind_at` on the round
- **Intention** — optional textarea ("What do you want to focus on this round?")
- Submit calls a server action `createRoundAction(formData)` which calls `createRound(...)` and redirects to `/scorecard`

Note: the `remind_at` field is stored in the DB now but email delivery is out of scope for this spec — see Reminders section below.

### `ReflectionsTrendChart`

**Client component** (recharts or a lightweight SVG implementation — follow existing chart patterns in `PillarHistoryChart.tsx`). Receives pre-computed data from the server component as props; does no fetching.

---

## Dashboard Changes

Replace the existing `ScheduleWidget` in `DashboardResults` with `ActiveRoundCard`.

- `ScheduleWidget` is removed from the dashboard layout
- `ActiveRoundCard` takes its place in the top-right card position
- The dashboard server component already fetches `inProgress` — pass `scoredPillarCount` derived from `inProgressScores.length`
- `nextRoundTitle` is computed from `new Date()` — extract quarter and year

The `scheduled_rounds` table and its DB functions remain in place (no migration to drop them), but `ScheduleWidget`, `setScheduledRoundAction`, and `cancelScheduledRoundAction` are deleted once `ActiveRoundCard` replaces them on the dashboard. `getScheduledRound` import is removed from `dashboard/page.tsx`.

---

## Navigation

Add "Reflections" to `components/app/Sidebar.tsx` between Growth and Team & Org:

```ts
{ href: '/reflections', icon: History, label: 'Reflections', id: 'nav-reflections' }
```

Import `History` from `lucide-react`.

---

## Reminders (stored, not sent — phase 2 for delivery)

The `remind_at` field is stored on the round now. Email delivery requires a scheduled background job (Netlify scheduled function or Supabase Edge Function cron) and is out of scope for this build. The field is present so the UI and the DB are ready.

**Recurring schedule (phase 2):** A `reflection_cadence` preference (off / monthly / quarterly / bi-annual) will live in profile settings. The UI for this setting is also deferred — add a placeholder hint in `CreateRoundModal` pointing to "Profile → Notifications" for now.

---

## New DB Function

```ts
// lib/db/manager-scores.ts addition
export async function getManagerScoresForAllRounds(
  userId: string
): Promise<Record<string, ManagerScore[]>>
// Returns manager scores keyed by round_id, for all complete rounds belonging to userId
```

---

## Error States

- `/reflections` with zero rounds: show the empty `ActiveRoundCard` CTA only; hide stats bar, chart, and table
- `/reflections/[id]` with a round belonging to another user: return 404 (not found, not unauthorised — don't leak existence)
- `/reflections/[id]` for an in-progress round: show it — allow viewing partial scores

---

## Testing

- Unit tests for `createRound` DB function (mock Supabase)
- Unit tests for `getRoundById` with mismatched user_id returning null
- Component tests for `CreateRoundModal`: renders fields, pre-fills title, calls server action on submit
- Component tests for `ActiveRoundCard`: active state vs empty state rendering
- Component tests for `ReflectionsTrendChart`: renders with empty data, with one round, with manager scores
- Component test for `RoundsHistoryTable`: renders correct number of rows, "View →" links correct href
- Integration test: `/reflections` page with zero rounds shows only empty state
