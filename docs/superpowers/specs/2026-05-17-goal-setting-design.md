# Goal Setting & Resource Library — Design Spec

## Goal

Redesign the Growth page into a full-featured goal management experience: a mission-control top section (active goals + top opportunities), a sortable skills table, a rich goal creation and detail flow with curated resources, structured evidence tracking, check-in scheduling, and a goal completion celebration. Replace the static Resources page with a database-driven resource library attached to skills.

---

## Scope

This spec covers:
1. Growth page redesign (top panels + sortable skills table)
2. Resource library (DB schema, resource types, seeding script, public Resources page)
3. Add Goal screen (rich form with contextual resources)
4. Goal Detail page (progress, evidence log, pinned resources)
5. Goal completion celebration (Lottie animation + affirmation)
6. Check-in status indicators on Growth page and Dashboard

Out of scope (Spec 2 — email):
- Email reminders triggered by check-in frequency
- `reminder_logs` table

---

## Data Model

### New tables

#### `resources`
```sql
create table public.resources (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  url           text not null,
  description   text not null,
  resource_type text not null check (resource_type in ('book','article','course','video','person','podcast','tool')),
  author        text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.resources enable row level security;

-- Public read (shared catalogue); writes via service role key only
create policy "Public can read resources"
  on public.resources for select using (true);
```

#### `skill_resources`
```sql
create table public.skill_resources (
  resource_id     uuid not null references public.resources(id) on delete cascade,
  skill_key       text not null,
  relevance_score int  not null default 3 check (relevance_score between 1 and 5),
  primary key (resource_id, skill_key)
);

alter table public.skill_resources enable row level security;
create policy "Public can read skill_resources"
  on public.skill_resources for select using (true);
```

#### `goal_resources` (resource pinned to a user's goal)
```sql
create table public.goal_resources (
  id          uuid primary key default gen_random_uuid(),
  plan_id     uuid not null references public.development_plans(id) on delete cascade,
  resource_id uuid not null references public.resources(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (plan_id, resource_id)
);

alter table public.goal_resources enable row level security;
create policy "Users manage own goal resources"
  on public.goal_resources for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

#### `goal_evidence`
```sql
create table public.goal_evidence (
  id           uuid primary key default gen_random_uuid(),
  plan_id      uuid not null references public.development_plans(id) on delete cascade,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  what_you_did text not null,
  impact       text not null,
  url          text,
  created_at   timestamptz not null default now()
);

alter table public.goal_evidence enable row level security;
create policy "Users manage own evidence"
  on public.goal_evidence for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

### Modified table: `development_plans`

Add two columns via migration:
```sql
alter table public.development_plans
  add column checkin_frequency_weeks int,
  add column last_checkin_at         timestamptz;
```

`checkin_frequency_weeks` stores the interval (2, 4, 6, 8, or any positive integer for "custom"). `last_checkin_at` is updated each time the user adds an evidence entry (treated as a check-in event).

### Note on `development_plans` id

The table has an `id uuid` primary key alongside the `(user_id, skill_key)` unique conflict key. `goal_resources` and `goal_evidence` reference `development_plans.id`. The `upsertPlan` helper must be updated to return (and expose) this id so client code can construct goal-scoped URLs.

---

## Resource Library

### Resource types

| Type | Badge colour | Examples |
|------|-------------|---------|
| `book` | Indigo | Manager's Path, Radical Candor |
| `article` | Teal | HBR, Pragmatic Engineer |
| `course` | Teal | LinkedIn Learning, Coursera |
| `video` | Red | TED Talks, YouTube |
| `person` | Amber | Lara Hogan, Gergely Orosz |
| `podcast` | Purple | Manager Tools, Coaching for Leaders |
| `tool` | Slate | Johari Window test, Daring Leadership Assessment |

Up to 8 resources per skill, ordered by `relevance_score` descending.

### Seeding script

`scripts/seed-resources.ts` — a local-only TypeScript script (run via `npx tsx scripts/seed-resources.ts`):

1. Iterates all 45 skills from `lib/skills.ts`
2. For each skill, generates up to 8 curated resources using the Claude API with web search (Anthropic SDK, `claude-opus-4-7` model, web search tool enabled)
3. Upserts into `resources` + `skill_resources` via the Supabase **service role key** (never the anon key)
4. Writes a log of what was added/updated

Script is re-runnable: existing resources are upserted by URL (unique on `resources.url`), new ones inserted. This makes periodic refresh safe.

```
scripts/
  seed-resources.ts    — main seed script
  refresh-resources.ts — same logic, run on a schedule locally (e.g. monthly cron)
```

### Public Resources page

`app/resources/page.tsx` becomes a server component fetching from the `resources` table. Replaces the hardcoded `RESOURCES` constant. Grouped by `resource_type`, same visual layout as today. Removes the need to hand-edit the file to add resources.

---

## Growth Page Redesign

Route: `/growth` (existing, full rewrite of `GrowthView`)

### Layout

Full width (`max-w-5xl` already set on the page container).

#### Top section — two columns

**Left: Active Goals**
- Header "Active Goals" + amber count badge
- One card per active plan (`planned` or `in_progress` status), sorted by check-in urgency (overdue first)
- Each card shows: skill name, pillar, goal text (truncated to 2 lines), check-in status chip, target date
- Check-in status chip:
  - Green "Check-in due in N days" — `last_checkin_at + checkin_frequency_weeks * 7 > now`
  - Amber "Check-in overdue" — past due date
  - No chip — no `checkin_frequency_weeks` set
- Clicking a card navigates to `/growth/goal/[id]`
- "+ Add a goal" button at the bottom (indigo dashed border, opens `/growth/goal/new`)

**Right: Top Opportunities**
- Header "Top Opportunities" + subtitle "Lowest-scoring, no active goal"
- Top 5 skills by ascending self-score that have no active plan
- Each row: skill name, pillar + level, score chip (colour-coded), "Set goal →" button (indigo)
- "Set goal →" navigates to `/growth/goal/new?skill=<skill_key>`

#### Bottom section — All Skills table

Columns: **Pillar** · **Skill** · **Level** · **Score** · **Status**

Status values:
- `💡 Opportunity` — score ≤ 2, no active plan (indigo chip)
- `🎯 Active goal` — has active plan (amber chip)
- `—` — no goal, score > 2

Sort controls (top right of table, pill buttons):
- **Rating ↑** (default — lowest first)
- **Pillar** (alphabetical by pillar then skill)
- **Skill** (alphabetical)

Active sort button uses amber fill; inactive buttons use slate border. Sort state is client-side (no URL param needed).

---

## Add Goal Screen

Route: `/growth/goal/new?skill=<skill_key>`

### Layout

Two-column: form left, resource panel right (collapses to stacked on mobile).

**Skill header**: skill name (large), pillar badge (amber), skill description below.

**Form fields**:
| Field | Type | Notes |
|-------|------|-------|
| What do you want to achieve? | `<textarea>` | Required, 3-row minimum |
| Target date | `<input type="date">` | Optional |
| Check-in every | `<select>` | Options: Every 2 weeks / Every 4 weeks / Every 6 weeks / Every 8 weeks / Custom (reveals number input in weeks). Stored as `checkin_frequency_weeks`. |

**Resource panel** (right column, `bg-slate-800` card):
- Heading "Resources for [Skill]"
- Shows up to 4 resources initially, "Show all N →" link to expand
- Each resource: type badge (colour-coded), title as link (`target="_blank"`), description
- **Add button** (indigo, lucide `Plus` icon 12px strokeWidth 1.75, "Add" label): adds resource to the goal on save
- Pre-selected resources are highlighted with amber border and show the "Added" state immediately
- Resources added here are saved as `goal_resources` rows when the form is submitted

**Save / Cancel buttons**. On save: redirect to `/growth/goal/[id]`.

If `skill` query param is present, that skill is pre-selected and the skill header is shown. If no param (e.g. from "+ Add a goal"), show a skill selector dropdown first.

---

## Goal Detail Page

Route: `/growth/goal/[id]`

Server component fetches: plan, skill data, goal resources, evidence entries. Passes to client components.

### Sections (top to bottom)

#### Header
- Skill name, pillar badge, status badge ("🎯 Active" or "✓ Complete")
- Goal text (full, not truncated)
- **Edit** button (slate) — opens inline edit or navigates to edit form
- **Mark complete ✓** button (green border) — triggers completion flow

#### Progress strip
- Days remaining (large number)
- Timeline progress bar (% of target_date elapsed since `created_at`)
- Check-in status: "✓ On track — next check-in [date]" (green) or "⚠ Check-in overdue" (amber)
- Hidden if no `target_date` or `checkin_frequency_weeks` set

#### Saved resources
- Section heading "Saved resources" + "N pinned · Browse all →" link
- One row per pinned resource: type badge, title link, description
- **Added button** (amber, lucide `BookmarkCheck` icon 12px strokeWidth 1.75): hover label becomes "Remove", click removes from goal
- If no resources pinned: soft "No resources saved yet" prompt

#### Browse all resources (collapsible, collapsed by default)
- Filter chips: All / Book / Article / Course / Video / Person / Podcast / Tool
- Each resource row: type badge, title link, **Add** (indigo Plus) or **Added** (amber BookmarkCheck) button
- Toggling add/remove is an optimistic UI update (server action fires in background)

#### Evidence log
- Heading "Evidence log" + amber "**+ Add evidence**" button
- Entries in reverse-chronological order
- Each entry: date, **what you did** (bold), impact/outcome (body), optional URL link
- Left border: green `#4ade80`

#### Add Evidence (inline form, shown on button click)
| Field | Type |
|-------|------|
| What did you do? | `<textarea>` required |
| What was the impact or outcome? | `<textarea>` required |
| Link (optional) | `<input type="url">` |

On save: optimistic insert, `last_checkin_at` updated to now on the plan (counts as a check-in).

---

## Goal Completion Celebration

When "Mark complete ✓" is clicked:

1. Server action marks `status = 'completed'`, `updated_at = now()`
2. On success: render `<GoalCompleteOverlay>` fullscreen overlay
3. Overlay contents:
   - Lottie animation (confetti — free animation from lottiefiles.com, bundled as JSON at `public/lottie/confetti.json`, played once via `lottie-react`)
   - "Goal complete" label (amber, small caps)
   - Skill name + "— achieved." (large, bold)
   - Affirmation text: static per-pillar strings stored in `lib/affirmations.ts` (e.g. 12 strings per pillar, selected by `(completedCount % 12)` so they rotate without repeating immediately)
   - Summary line: "Skill · N months · N evidence entries"
   - Two CTAs: "View completed goals →" (amber) and "Back to Growth" (slate)
4. Overlay dismisses on either CTA click

**Dependency**: `lottie-react` (npm package). One free confetti animation JSON bundled — no runtime fetch.

---

## Server Actions

All in `app/(app)/growth/actions.ts` (extend existing file):

| Action | Description |
|--------|-------------|
| `saveGoalAction(formData)` | Create/update plan including `checkin_frequency_weeks`, plus bulk-insert `goal_resources` for pre-selected resources |
| `markGoalCompleteAction(planId)` | Set `status = 'completed'` |
| `addEvidenceAction(formData)` | Insert `goal_evidence` row, update `last_checkin_at` on plan |
| `addGoalResourceAction(planId, resourceId)` | Insert `goal_resources` row |
| `removeGoalResourceAction(planId, resourceId)` | Delete `goal_resources` row |

All revalidate `/growth` and `/growth/goal/[id]` on success.

---

## DB Helpers

| File | Exports |
|------|---------|
| `lib/db/resources.ts` | `getResourcesForSkill(skillKey)`, `getAllResources()` |
| `lib/db/goal-resources.ts` | `getGoalResources(planId)`, `addGoalResource(planId, resourceId, userId)`, `removeGoalResource(planId, resourceId)` |
| `lib/db/goal-evidence.ts` | `getEvidenceForPlan(planId)`, `addEvidence(...)` |
| `lib/db/development-plans.ts` | Update `upsertPlan` to accept `checkin_frequency_weeks`; add `getPlanById(id)` |

---

## Components

| Component | Type | Description |
|-----------|------|-------------|
| `ActiveGoalsPanel` | Client | Left column — goal cards with check-in chips |
| `OpportunitiesPanel` | Server | Right column — top 5 lowest-scoring skills with no goal |
| `SkillsTable` | Client | Sortable all-skills table |
| `GoalForm` | Client | Add/edit form with resource panel |
| `ResourcePanel` | Client | Contextual resources list with Add/Added toggle |
| `ResourceRow` | Client | Single resource with type badge + add/remove button |
| `GoalDetail` | Server | Fetches and renders full goal page |
| `ProgressStrip` | Client | Days remaining + progress bar + check-in status |
| `EvidenceLog` | Client | Evidence entries + Add Evidence inline form |
| `GoalCompleteOverlay` | Client | Lottie celebration + affirmation + CTAs |

---

## Routes

| Route | Description |
|-------|-------------|
| `/growth` | Redesigned growth page |
| `/growth/goal/new` | Add goal (skill selector if no `?skill=` param) |
| `/growth/goal/new?skill=<key>` | Add goal pre-seeded with skill |
| `/growth/goal/[id]` | Goal detail |
| `/resources` | Public resources page — now DB-driven |

---

## Dashboard check-in indicator

The dashboard's Active Goals panel (right column, `ScheduleWidget` area — or alongside it) should surface overdue check-ins. When `last_checkin_at + checkin_frequency_weeks * 7 < now()` for any active plan, show an amber nudge: "You have N check-in(s) overdue" linking to `/growth`. This is computed server-side in `app/(app)/dashboard/page.tsx` alongside the existing data fetch.

---

## Out of scope

- Editing a completed goal (status is terminal in this spec)
- Deleting a plan (future)
- Multiple goals per skill (one active plan per skill is the current constraint — unchanged)
- Push/browser notifications
- Email reminders (Spec 2)
