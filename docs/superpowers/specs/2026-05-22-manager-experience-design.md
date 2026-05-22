# Manager Experience Design

**Date:** 2026-05-22  
**Status:** Approved — ready for implementation planning  
**Scope:** Manager-aware dashboard, team reflections history, reusable notification system, blind scoring toggle, manager tour

---

## Overview

The tool currently treats every logged-in user identically. A manager who has direct reports that have completed reflections sees the same empty-state "start your scorecard" screen as a first-time individual contributor. This design adds a manager-aware layer across the dashboard, reflections page, and notification system — without changing anything for non-managers.

A user is a manager for UI purposes when they have at least one active direct report (`connections` table, `status = 'active'`, `manager_id = user.id`). A user can be both a manager and a direct report simultaneously; all manager UI appears alongside (not instead of) their own scorecard view.

---

## Part 1: Architecture & Data Model

### 1.1 Assessment Round State Machine

`assessment_rounds.status` gains a third value: `'scheduled'`.

```
scheduled → in_progress → complete
```

**Current:** `IN ('in_progress', 'complete')`  
**New:** `IN ('scheduled', 'in_progress', 'complete')`

When a round is added to `scheduled_rounds`, an `assessment_rounds` row is also created eagerly with `status = 'scheduled'` and `user_id = direct_report_id`. This gives the manager a `round_id` to score against before the DR has started.

When the DR opens their reflection, the round transitions `scheduled → in_progress`.  
When the DR submits, it transitions `in_progress → complete`.

The manager can score against a round in **any** of these three states. `scheduled_rounds` remains the scheduling source of truth; `assessment_rounds` is the scoreable entity.

**Migration note:** Drop and recreate the `status` check constraint — do not attempt `ALTER` in-place, as the existing constraint must be removed before the new value can be added (avoids 23514 errors).

### 1.2 Manager Scoring Completeness

The existing `managerHasScored: boolean` field is replaced with a three-state enum throughout:

| Value | Meaning |
|---|---|
| `not_started` | Zero `manager_scores` rows for this round from this manager |
| `in_progress` | Some skills scored, but not all 5 pillars × all skills |
| `complete` | Every skill across all 5 pillars has a manager score row |

New function in `lib/db/manager-scores.ts`:

```ts
export async function getManagerScoringStatus(
  roundId: string,
  managerId: string
): Promise<'not_started' | 'in_progress' | 'complete'>
```

"Complete" check: `PILLARS.every(p => getSkillsByPillar(p).every(s => managerScores.some(ms => ms.skill_key === s.key)))`.

The `DirectReportRoundSummary` type in `lib/db/direct-reports.ts` is updated:

```ts
export interface DirectReportRoundSummary {
  roundId: string | null
  roundStatus: 'scheduled' | 'in_progress' | 'complete' | 'none'
  managerScoringStatus: 'not_started' | 'in_progress' | 'complete'
  pillarsScored: number        // 0–5
  lastScore: number | null
  nextScheduledDate: string | null
  completedAt: string | null
}
```

`getDirectReportRoundSummaries` is updated to:
- Query rounds across all three statuses (not just in_progress/scheduled separately)
- Return `roundId` for direct linking
- Compute `pillarsScored` by counting fully-scored pillars from `manager_scores`
- Remove the `managerHasScored` boolean

### 1.3 Score Reveal Gating

The DR cannot see manager scores until their own round is `complete`.

`getManagerScoresForDirectReport(roundId)` in `lib/db/manager-scores.ts` gains an explicit guard: it fetches the round status first and returns `[]` if `status !== 'complete'`. This makes the intent documented and prevents future callers from accidentally leaking pre-completion scores.

The DR's dashboard shows a "Your manager's perspective" section on the radar only when:
1. Their round is `complete`, AND
2. Manager scores exist for that round

No UI hint is shown to the DR that their manager has scored before they complete. There is no "your manager has assessed you — complete your reflection to see" message. The reveal is silent.

### 1.4 Notification System — Database

New table: `public.notifications`

```sql
CREATE TABLE public.notifications (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type        TEXT        NOT NULL,
  payload     JSONB       NOT NULL DEFAULT '{}',
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can mark own notifications read"
  ON public.notifications FOR UPDATE
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX notifications_user_unread
  ON public.notifications (user_id, read_at)
  WHERE read_at IS NULL;
```

The `INSERT` policy uses `WITH CHECK (true)` because inserts are performed server-side via the service role key, which bypasses RLS. The policy exists to document intent. All reads and mark-as-read operations use the anon key scoped to the authenticated user.

`type` is a plain `TEXT` — not a Postgres enum — so new notification types can be added without migrations. TypeScript discriminated unions enforce type safety in application code.

**Notification taxonomy (initial):**

| `type` | Trigger | Recipient | Payload |
|---|---|---|---|
| `manager_scoring_needed` | DR completes a round | Manager | `{ directReportId, directReportName, roundId }` |
| `connection_request_received` | Connection created | Other party | `{ fromUserId, fromUserName, connectionId }` |
| `connection_accepted` | Connection accepted | Initiator | `{ byUserId, byUserName, connectionId }` |
| `round_scheduled` | Round scheduled for DR | DR | `{ roundId, scheduledDate }` |

### 1.5 Profiles Table Additions

```sql
ALTER TABLE public.profiles
  ADD COLUMN email_notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE public.profiles
  ADD COLUMN manager_scoring_blind BOOLEAN NOT NULL DEFAULT FALSE;
```

Both columns default to the most user-friendly state. Existing rows get the default automatically. No data migration required.

---

## Part 2: Notification System — Application Layer

### 2.1 `lib/notifications.ts`

Central module for all notification operations. Establishes the TypeScript type system.

```ts
export type NotificationType =
  | 'manager_scoring_needed'
  | 'connection_request_received'
  | 'connection_accepted'
  | 'round_scheduled'

export interface NotificationPayload {
  manager_scoring_needed: {
    directReportId: string
    directReportName: string
    roundId: string
  }
  connection_request_received: {
    fromUserId: string
    fromUserName: string
    connectionId: string
  }
  connection_accepted: {
    byUserId: string
    byUserName: string
    connectionId: string
  }
  round_scheduled: {
    roundId: string
    scheduledDate: string
  }
}

export interface Notification<T extends NotificationType = NotificationType> {
  id: string
  userId: string
  type: T
  payload: NotificationPayload[T]
  readAt: string | null
  createdAt: string
}
```

Exported functions:

| Function | Description |
|---|---|
| `createNotification(userId, type, payload)` | Insert via service role key. Throws on DB error. Server-side only. |
| `getNotificationsForUser(userId, limit?)` | Returns notifications newest-first. Default limit 50. |
| `getUnreadCount(userId)` | Returns `number`. Used by layout for badge. |
| `markAsRead(notificationId, userId)` | Sets `read_at = now()`. Scoped to user. |
| `markAllAsRead(userId)` | Bulk update. Used by "Mark all read" button. |

### 2.2 `lib/email/notifications.ts`

Email delivery via Mailgun. One function per notification type.

```ts
export async function sendManagerScoringNeededEmail(
  managerEmail: string,
  directReportName: string,
  dashboardUrl: string
): Promise<void>

export async function sendConnectionRequestEmail(
  recipientEmail: string,
  fromName: string,
  connectionsUrl: string
): Promise<void>

export async function sendConnectionAcceptedEmail(
  recipientEmail: string,
  byName: string,
  dashboardUrl: string
): Promise<void>

export async function sendRoundScheduledEmail(
  recipientEmail: string,
  scheduledDate: string,
  scorecardUrl: string
): Promise<void>
```

Each function:
1. Fetches `profiles.email_notifications_enabled` for the recipient — returns early if false
2. Calls Mailgun via `MAILGUN_API_KEY` / `MAILGUN_SENDING_KEY`
3. Uses inline HTML templates (no external template engine needed at this scale)
4. Wraps the Mailgun call in `try/catch` and logs errors via `console.error` — never throws. Email failure must not crash server actions.

**Email subjects:**

| Type | Subject |
|---|---|
| `manager_scoring_needed` | "Action needed: [Name] has completed their self-reflection" |
| `connection_request_received` | "[Name] wants to connect on Brilliant Managers" |
| `connection_accepted` | "[Name] accepted your connection request" |
| `round_scheduled` | "Your next reflection round is scheduled for [date]" |

### 2.3 Trigger Points

Notifications are created inside existing server actions — no database triggers, no background workers.

**Pattern:**
```ts
// 1. Perform the primary operation (throws on failure — transaction aborts)
await markRoundComplete(roundId)

// 2. Create in-app notification (awaited — we want this recorded)
await createNotification(managerId, 'manager_scoring_needed', {
  directReportId: userId,
  directReportName: name,
  roundId,
})

// 3. Send email (fire-and-forget — failure is non-fatal)
void sendManagerScoringNeededEmail(managerEmail, name, dashboardUrl)
```

**Locations to update:**

| Notification type | File to update |
|---|---|
| `manager_scoring_needed` | Round completion server action (wherever `status` → `'complete'`) |
| `connection_request_received` | Connection creation / acceptance server actions |
| `connection_accepted` | Connection acceptance server action |
| `round_scheduled` | Round scheduling server action |

### 2.4 In-App Bell — Sidebar

`app/(app)/layout.tsx` fetches `getUnreadCount(userId)` server-side and passes it to the sidebar. The sidebar renders an amber badge on the Notifications nav item when count > 0. Count ≥10 displays as "9+". No client-side polling; count refreshes on full navigation. Realtime updates are out of scope for v1.

### 2.5 Notifications Page

`app/(app)/notifications/page.tsx` — currently a stub, becomes functional.

**Layout (top to bottom):**
- Page header: "Notifications" | "Mark all read" button (right-aligned, only shown when unread count > 0)
- Notification list, newest-first, client component
- `useEffect` on mount calls `markAllAsRead` — viewing the page clears the badge

**Per-notification row:**
- Left border highlight + lighter background for unread rows
- Icon per notification type (distinct Lucide icon)
- Title + description derived from payload (e.g. "Sarah K. completed their self-reflection. Score them now.")
- Relative timestamp ("2 hours ago", "3 days ago") — use `formatDistanceToNow` from `date-fns` (already a transitive dep via shadcn)
- Entire row is a link to the relevant destination

**Notification → destination:**

| Type | Destination |
|---|---|
| `manager_scoring_needed` | `/manager/[directReportId]` |
| `connection_request_received` | `/people` |
| `connection_accepted` | `/people` |
| `round_scheduled` | `/scorecard` |

**Empty state:** "You're all caught up." — plain text, no icon.

---

## Part 3: Dashboard Changes

### 3.1 Page-Level Render States

`app/(app)/dashboard/page.tsx` gains parallel data fetches for direct reports alongside existing fetches. Three render states:

| State | Condition | Renders |
|---|---|---|
| Manager first-access | Has ≥1 active DR with any active round AND zero own complete rounds | Manager-first empty state |
| Manager + results | Has ≥1 active DR with any active round AND has own complete rounds | `ManagerStrip` then `DashboardResults` |
| Self only (existing) | No active DRs with any active round | Existing empty state or `DashboardResults` unchanged |

"Active round" = a round for a DR with `status IN ('scheduled', 'in_progress', 'complete')`.

The `ManagerStrip` shows all DRs with active rounds, including fully-scored ones (shown as muted ✓ Done cards). The strip disappears only when the manager has no direct reports with any active round at all — it does not disappear the moment all scoring is complete, so the manager retains visibility of who they've scored.

### 3.2 `ManagerStrip` Component

**File:** `components/dashboard/ManagerStrip.tsx` (client component)

**Props:**
```ts
interface DirectReportCardData {
  userId: string
  displayName: string
  roundId: string
  roundStatus: 'scheduled' | 'in_progress' | 'complete'
  managerScoringStatus: 'not_started' | 'in_progress' | 'complete'
  pillarsScored: number    // 0–5
  completedAt: string | null
}

interface ManagerStripProps {
  directReports: DirectReportCardData[]  // ALL DRs with any active round (including fully-scored)
}
```

**Visual treatment:**
- Amber-tinted container: `rgba(245,158,11,0.08)` background, `1px solid rgba(245,158,11,0.35)` border, `10px` border-radius
- Header row: "TEAM SCORING NEEDED" label (amber, 10px uppercase) | "N of M direct reports assessed" subtext
- CSS grid of DR cards: `repeat(auto-fit, minmax(180px, 1fr))`, max 4 columns
- Fully-scored DRs (`managerScoringStatus === 'complete'`) are included as muted "✓ Done" cards — manager sees the full picture

**Per DR card states:**

| `managerScoringStatus` | Progress bar | Status text | Border |
|---|---|---|---|
| `not_started` | 0%, amber | "Not scored · Start →" | Amber |
| `in_progress` | `pillarsScored/5 * 100%`, blue | "N of 5 pillars · Continue →" | Blue |
| `complete` | 100%, green | "✓ Fully scored" | Green, muted |

Each card (except `complete`) is a `Link` to `/manager/[userId]?roundId=[roundId]`.

The strip appears at the top of the dashboard content area, above `DashboardResults`. There is no tour button in the Manager+Results state — the tour button only appears in the manager first-access empty state (Section 3.3).

### 3.3 Manager First-Access Empty State

Renders when: manager role detected AND zero own complete rounds AND at least one scoreable DR round exists.

**Structure (top to bottom):**

1. **`DashboardManagerTour` button** — teal, same style as `DashboardTour`, label: "Take the manager tour — new here? Start here"
2. **Action needed panel** (amber, prominent, full-width) — same component as `ManagerStrip` but without width constraint. Header: "YOUR TEAM NEEDS YOUR ASSESSMENT"
3. **Own scorecard panel** (muted, secondary) — copy: "When you're ready, run your own self-assessment too." Quiet link: "Start your scorecard →". No benefit strips. No "real clarity" headline.

When manager role detected AND zero own rounds AND zero scoreable DR rounds: existing self-first empty state renders unchanged. The manager-first layout only activates when there is actually something for the manager to do.

---

## Part 4: Reflections Page — Team Section

### 4.1 Page Structure

The existing `/reflections` page gains a team section below all existing content. Non-managers see no change. The section only renders when `directReportIds.length > 0`.

```
─────────────────────────────────────────
  [existing: ReflectionsHeader]
  [existing: stats bar]
  [existing: ReflectionsTrendChart]
  [existing: RoundsHistoryTable]
─────────────────────────────────────────
  [new: 1px divider, 32px margin]
─────────────────────────────────────────
  YOUR TEAM'S REFLECTIONS (purple label)
  [new: TeamReflectionsSection]
─────────────────────────────────────────
```

### 4.2 Data Fetching

New type:

```ts
interface TeamMemberReflectionSummary {
  userId: string
  displayName: string
  email: string
  rounds: {
    roundId: string
    roundLabel: string
    roundStatus: 'scheduled' | 'in_progress' | 'complete'
    selfScore: number | null          // null unless round is complete
    managerScore: number | null       // null unless this manager has fully scored
    managerScoringStatus: 'not_started' | 'in_progress' | 'complete'
    pillarsScored: number
    completedAt: string | null
  }[]
  totalRounds: number
  pendingScoringCount: number
}
```

New function: `getTeamReflectionSummaries(directReportIds: string[], managerId: string): Promise<TeamMemberReflectionSummary[]>` in `lib/db/direct-reports.ts`.

Runs in `Promise.all` alongside existing fetches. Returns `[]` immediately if `directReportIds` is empty.

### 4.3 `TeamReflectionsSection` Component

**File:** `components/reflections/TeamReflectionsSection.tsx` (server-compatible)

**Layout:** One card per direct report, stacked vertically.

**Per-DR card:**
- **Card header:** avatar initials | display name | round count | pending badge (amber "⚠ N needs scoring" or green "✓ All scored")
- **Round rows** (one per round, newest first):

| Column | Content |
|---|---|
| Label | "Round N — Mon YYYY" |
| Status pill | `scheduled` (blue-grey) / `in_progress` (green) / `complete` (muted) |
| Self score | Shown only if round is `complete`. `—` otherwise. |
| Manager score | "Mgr: X.X ✓" if complete / "N/5 pillars" if in_progress / "Score →" link if not_started |
| Action | "Score →" or "Continue →" link to `/manager/[userId]?roundId=[roundId]` |

**Sort order:** DRs with `pendingScoringCount > 0` first, then fully-scored DRs alphabetically.

**Empty state** (DRs exist but no rounds started): "Your team hasn't started any reflections yet." — muted text, no CTA.

### 4.4 Manager Scoring Page — `roundId` Param

`app/(app)/manager/[userId]/page.tsx` currently calls `getLatestCompleteRound(userId)` unconditionally.

Change: accept an optional `roundId` search param.
- If `?roundId=xxx` provided: fetch that specific round, verify `user_id = userId` (guard against IDOR — a manager must not be able to score rounds belonging to non-direct-reports)
- If not provided: fall back to `getLatestCompleteRound(userId)` (preserves existing behaviour)

When the fetched round has `status = 'scheduled'`, a contextual note appears above the pillar list:

> "This round hasn't started yet — you can score ahead of time and your assessment will be ready when [Name] completes theirs."

---

## Part 5: Scoring Interface — Informed / Blind Mode

### 5.1 `ManagerScoringView` Props

```ts
interface Props {
  roundId: string
  pillar: string
  pillarLabel: string
  skills: Skill[]
  initialScores: Record<string, Level>
  directReportName: string
  userId: string
  directReportScores: Record<string, Level> | null   // NEW
  isBlindMode: boolean                                // NEW
}
```

`directReportScores` is `null` when:
1. `manager_scoring_blind = true` in the manager's profile, OR
2. The round `status` is not `'complete'` (DR hasn't scored yet — nothing to show)

### 5.2 Informed Mode UI

When `directReportScores` is not null, each `SkillCard` renders a secondary "Their view: [Level]" badge beneath the skill name. The manager's level selector is unchanged. A one-line contextual note appears at the top of the scoring interface (muted, small):

> "Showing [Name]'s self-assessment — switch to blind mode in your profile settings."

### 5.3 Data Flow in `/manager/[userId]`

The page server-component:
1. Fetches the round and verifies access
2. Fetches the manager's profile (`manager_scoring_blind`)
3. If `!manager_scoring_blind` AND round `status === 'complete'`: fetches DR's scores via `getScoresForRound(round.id)`, builds `Record<string, Level>` keyed by `skill_key`
4. Otherwise passes `directReportScores: null`

---

## Part 6: Manager Tour & Profile Settings

### 6.1 `DashboardManagerTour` Component

**File:** `components/dashboard/DashboardManagerTour.tsx`  
**Library:** driver.js (same as existing `DashboardTour`)  
**Persistence key:** `bm_manager_tour_seen` (distinct from `bm_tour_seen`)  
**Button:** Same teal style as `DashboardTour`. Label: "Take the manager tour — new here? Start here"

The generic `DashboardTour` is suppressed for users detected as managers. `DashboardManagerTour` replaces it in all contexts.

**Tour steps:**

| # | Target element ID | Title | Description |
|---|---|---|---|
| 1 | `#manager-strip` | Your team's action queue | When any of your direct reports completes a reflection, they appear here. This is your cue to add your own perspective — before they see yours. |
| 2 | First DR card in `#manager-strip` | Score a direct report | Click any card to score that person across all five pillars. You can score ahead of time, even before they've finished their own reflection. |
| 3 | `#nav-reflections` | Your history — and theirs | The Reflections page shows your own rounds at the top and your team's reflection history below. One place for the full picture. |
| 4 | `#nav-connections` | Your team structure | Team & Org is where you manage who reports to you and invite new direct reports to join. |
| 5 | `#nav-avatar` | Blind scoring preference | In your profile settings you can choose whether to see your direct report's self-scores while you assess them — or score blind to avoid anchoring. |

Steps 1 and 2 are only included when `#manager-strip` is present on the page. If the strip is absent (all DRs fully scored), the tour starts at step 3. Steps array is built dynamically before `driver().drive()` is called.

### 6.2 Profile Settings — Manager Preferences Section

**File:** `app/(app)/profile/page.tsx`

A "Manager preferences" section appears for users with at least one active direct report. Position: below existing profile fields, above any danger zone / account deletion.

Contains a single `Switch` (shadcn/ui):

> **Score blind**  
> Hide your direct report's self-assessment scores while you're assessing them. Useful if you want your perspective to be independent before comparing.

State is persisted immediately on toggle via a server action — no save button. The server action updates `profiles.manager_scoring_blind` for the authenticated user.

---

## Part 7: `.gitignore` Addition

```
.superpowers/
```

---

## Implementation Phases & PR Break Points

The work is designed to be delivered in four sequential PRs. Each PR is independently reviewable and deployable.

### PR 1 — Foundation: Data Model & Notification System

**Scope:**
- Migration: add `'scheduled'` status to `assessment_rounds`, add `email_notifications_enabled` and `manager_scoring_blind` to `profiles`, create `notifications` table with RLS
- `lib/notifications.ts` — full type system and CRUD functions
- `lib/email/notifications.ts` — Mailgun wrappers for all four notification types
- Wire `manager_scoring_needed` notification into round completion server action
- Wire `connection_request_received` and `connection_accepted` into connection server actions
- Wire `round_scheduled` into scheduling server action
- Notifications page (`app/(app)/notifications/page.tsx`) — functional list + mark-as-read
- Sidebar unread badge
- `getManagerScoringStatus` function replacing `managerHasScored`
- `DirectReportRoundSummary` type update

**What this PR does NOT include:** any dashboard or reflections UI changes.

**Tests:** notification creation, unread count, mark-as-read, email function called/not called based on opt-out flag.

---

### PR 2 — Manager Dashboard Strip & Empty State

**Scope:**
- Extend `getDirectReportRoundSummaries` to return `roundId`, `pillarsScored`, `managerScoringStatus`, all three round statuses
- `ManagerStrip` component
- Dashboard page: detect manager state, render `ManagerStrip` above results
- Manager first-access empty state (manager-first layout)
- `DashboardManagerTour` component (driver.js, 5 steps, dynamic step list)
- Suppress generic `DashboardTour` for managers
- `/manager/[userId]` page: add `roundId` search param, handle `scheduled` round state, show contextual note

**Tests:** `ManagerStrip` renders correct cards per scoring state; dashboard renders correct state for each of the three conditions.

---

### PR 3 — Informed / Blind Scoring

**Scope:**
- Profile page: "Manager preferences" section with `manager_scoring_blind` toggle and server action
- `ManagerScoringView`: add `directReportScores` and `isBlindMode` props
- `SkillCard`: render "Their view: [Level]" badge when `directReportScores` provided
- `/manager/[userId]` server component: fetch blind setting and DR scores, pass correct props

**Tests:** scoring view renders DR scores in informed mode; renders nothing in blind mode; DR scores not shown when round is not complete regardless of blind setting.

---

### PR 4 — Team Reflections Section

**Scope:**
- `getTeamReflectionSummaries` DB function
- `TeamReflectionsSection` component
- Reflections page: fetch team summaries, render section for managers
- Score reveal gating: `getManagerScoresForDirectReport` guard added
- Verify unauthenticated curl tests pass for `notifications` table (per CLAUDE.md checklist)

**Tests:** team section renders correct round rows; pending scoring sorted first; empty state when no rounds; score reveal guard returns empty for non-complete rounds.

---

## Open Questions (resolved)

| Question | Decision |
|---|---|
| What triggers manager scoring? | Any round in scheduled/in_progress/complete state with incomplete manager scoring |
| Does DR see manager scores before completing? | No — gated at data layer, no UI hint |
| Default for blind scoring toggle? | FALSE (informed mode — manager sees DR scores). User can switch to blind in profile. |
| Should DR see "manager has scored you" hint? | No — reveal is silent until completion |
| Notification delivery on email failure? | In-app notification is persisted; email is fire-and-forget, swallows errors |
| Realtime notification badge? | Out of scope for v1 — badge updates on navigation |
| One spec or two (notification system separate)? | One spec — manager experience defines what "reusable" means for the notification system |
