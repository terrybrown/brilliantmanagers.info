# Manager Scorecard App — Design Spec (Phase 1)

## Goal

Replace the Google Sheets scorecard with a web app built into brilliantmanagers.info. Users create accounts, score themselves across 6 pillars, save snapshots over time, and optionally invite a manager to score them for a self-vs-manager comparison.

## Architecture

**Stack:** Next.js 15 App Router (existing) + Supabase (auth + PostgreSQL) + Recharts (radar + bar charts) + Netlify (existing hosting)

**Structure:** Next.js route groups split the site into two distinct areas:
- `(marketing)` — existing public site, unchanged
- `(app)` — auth-gated scorecard product

Both share the same codebase, design system, and Netlify deployment.

---

## Route Structure

```
app/
  (marketing)/
    page.tsx                  ← homepage (unchanged)
    the-guide/                ← guide (unchanged)
    the-tool/page.tsx         ← marketing page, CTAs to /login or /scorecard
    blog/                     ← unchanged
    resources/                ← unchanged

  (app)/
    layout.tsx                ← session check + beta allowlist gate
    scorecard/
      page.tsx                ← pillar picker — user's home base
    scorecard/[pillar]/
      page.tsx                ← scoring view for one pillar
    results/
      page.tsx                ← radar + pillar drill-down results
    connections/
      page.tsx                ← manage manager / direct report links
    manager/[userId]/
      page.tsx                ← score a direct report's skills

  login/
    page.tsx                  ← magic link request form
  auth/callback/
    page.tsx                  ← Supabase auth redirect handler
```

---

## Feature Flag (Beta Access)

The `(app)` layout checks two things before rendering:
1. User is authenticated (valid Supabase session)
2. User's email appears in the `APP_BETA_EMAILS` environment variable (comma-separated)

If either check fails, the user is redirected to `/the-tool` (the marketing page). This allows production deploys to proceed while the app is only accessible to approved users. To grant access, add an email to `APP_BETA_EMAILS` in the Netlify environment — no code change required. To open the app publicly, remove the allowlist check.

---

## Data Model (Supabase / PostgreSQL)

### `profiles`
Extends `auth.users`. Created automatically on first sign-in.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | FK → `auth.users` |
| `display_name` | `text` | |
| `email` | `text` | |
| `created_at` | `timestamptz` | |

### `assessment_rounds`
One record per reflection session. Scores never overwrite — each session creates a new round. This supports historical trend views in future phases.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK |
| `user_id` | `uuid` | FK → `profiles` |
| `status` | `text` | `in_progress` \| `complete` |
| `created_at` | `timestamptz` | |
| `completed_at` | `timestamptz` | Set when all 6 pillars scored |

### `scores`
One row per skill per round.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK |
| `round_id` | `uuid` | FK → `assessment_rounds` |
| `pillar` | `text` | `self` \| `team` \| `strategy` \| `communications` \| `domain-expertise` \| `measurement` |
| `skill_key` | `text` | Unique identifier per skill, stable across rounds |
| `level` | `text` | `Needs Improvement` \| `Basic` \| `Proficient` \| `Advanced` \| `Expert` |
| `scored_at` | `timestamptz` | |

### `manager_scores`
Manager's ratings of a direct report. Linked to the direct report's round (not a separate round).

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK |
| `round_id` | `uuid` | FK → `assessment_rounds` (the direct report's round) |
| `manager_id` | `uuid` | FK → `profiles` |
| `skill_key` | `text` | |
| `level` | `text` | |
| `scored_at` | `timestamptz` | |

### `connections`
Bidirectional relationship between a manager and a direct report. Either party can initiate.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK |
| `manager_id` | `uuid` | FK → `profiles` |
| `direct_report_id` | `uuid` | FK → `profiles` |
| `status` | `text` | `pending` \| `active` |
| `initiated_by` | `uuid` | FK → `profiles` |
| `created_at` | `timestamptz` | |

Row-level security on all tables. Users read/write their own data only. Managers can read `scores` rows for direct reports where an active connection exists.

---

## Skill Definitions

Skills are currently defined in MDX content files but their descriptions exist only as prose — not in a machine-readable form. The implementation must define all skills with stable keys and one-sentence descriptions directly in `lib/skills.ts`. The MDX content remains the authoritative long-form reference; `lib/skills.ts` is the app's structured extract.

A new `lib/skills.ts` will define the full skill list:

```ts
interface Skill {
  key: string          // stable unique ID, e.g. 'self-awareness'
  pillar: string       // e.g. 'self'
  label: string        // display name
  description: string  // one-sentence description for the scoring UI
}
```

The `skill_key` in the database references `Skill.key`. If a skill is ever renamed, the key stays the same.

---

## User Flows

### Sign up / sign in
1. User visits `/the-tool` → clicks "Open the scorecard" → redirected to `/login` (or `/scorecard` if already signed in)
2. `/login`: enter email → Supabase sends magic link
3. User clicks link → `/auth/callback` → profile created if first visit → redirect to `/scorecard`

### Scoring a pillar
1. `/scorecard`: pillar picker shows 6 pillars with completion status (not started / in progress / complete + average score)
2. Click a pillar → `/scorecard/[pillar]`
3. All skills load expanded: name + description + 5-level picker visible
4. Selecting a level saves the score immediately (no submit button) and collapses that skill to a compact row showing the chosen level + an edit icon
5. Collapsed skills can be re-expanded by tapping to change the score
6. When all skills in the pillar are scored, a "Done — back to pillars" button appears
7. Returning to `/scorecard` shows the pillar as complete with its average score

A round is created as `in_progress` when the first score is saved. It is marked `complete` when all 6 pillars have at least one score each.

### Connecting a manager / direct report
1. From `/connections`: enter the other person's email and their role (my manager / my direct report)
2. If they have an account: a `connection` record is created with `status: pending`; they see a notification on their next login and can accept or decline
3. If they don't have an account: Supabase sends them an invite email; on account creation they are prompted to accept the pending connection
4. On acceptance: `status` updates to `active`; both users now see each other in their connections

Either party can initiate. A manager adding a direct report and a direct report inviting their manager produce the same result.

### Manager scoring a direct report
1. Manager visits `/connections` → sees direct reports with active connections
2. Clicks a direct report → `/manager/[userId]`
3. Same pillar picker and scoring flow, labelled "Scoring [Name]"
4. Scores save to `manager_scores` linked to the direct report's latest complete round
5. Direct report is notified (in-app, next login) that their manager has submitted scores

### Results view
URL: `/results`

If no complete round exists, `/results` redirects to `/scorecard` with a prompt to finish scoring. Partial results (some pillars scored, not all) are not shown — the results view requires a complete round.


**Solo user (no active connections):**
- Radar chart: self scores only, amber fill, no toggles shown
- Pillar list: colour-coded score bars, click to expand
- Expanded pillar: per-skill bar chart (self only)
- Prompt at bottom: "Invite your manager to compare scores"

**Connected user (manager has scored):**
- Toggle chips: Self (always on, amber), Manager (toggleable, blue), Org (disabled, "coming soon")
- Radar: layers update as toggles change
- Expanded pillar: grouped bar chart — amber bar (self) + blue bar (manager) per skill
- Gap analysis: skills where self and manager scores differ by 2+ levels are highlighted

---

## UI Behaviour Details

**Scoring view state logic:**
- `unscored` → expanded card (name + description + level picker)
- `scored` → collapsed row (name + badge + edit icon)
- Tapping a collapsed row re-expands it
- Active card (most recently expanded) gets a subtle highlight border

**Adaptive results view:**
- Manager/Org toggle section is hidden entirely if user has no active connections
- It appears automatically once a manager connection becomes active
- No "not connected" placeholder — the UI simply doesn't show comparison affordances

**The-tool marketing page:**
- `/the-tool` continues to show the Google Sheet CTA as the primary action
- Secondary CTA: "Try the new app (beta)" → `/login`
- Once `APP_BETA_EMAILS` is removed, the Google Sheet CTA is retired and the app CTA becomes primary

---

## Technical Decisions

| Decision | Choice | Reason |
|---|---|---|
| Auth | Supabase magic links | No password management; fits professional audience; Supabase native |
| Database | Supabase PostgreSQL | Relational model supports connections + org hierarchy in Phase 2; RLS built in |
| Charts | Recharts | Well-maintained React chart library; has RadarChart and BarChart; good TypeScript support |
| Middleware | Next.js `middleware.ts` | Protects `(app)` routes at the edge; checks session + beta allowlist |
| Supabase client | Server components where possible | Less client JS; auth tokens handled server-side |
| Skill definitions | `lib/skills.ts` extracted from MDX | Single source of truth; stable `skill_key` for DB references |
| Invite emails | Netlify Function + Resend | Supabase handles magic links; connection invites need a custom email |
| Feature flag | `APP_BETA_EMAILS` env var | No code change to add/remove users; remove check to go public |

---

## Out of Scope (Phase 1)

- Historical trend view (data model supports it; UI deferred to Phase 2)
- Org registration and hierarchy beyond one-to-one connections
- Org benchmark scores
- LinkedIn OAuth (add in Phase 2)
- Email notifications beyond magic links and connection invites
- Mobile app

---

## Phase 2 Preview

The data model is designed to extend cleanly:
- `organisations` table + `org_memberships` to support org registration
- `org_scores` for benchmark data (average scores across an org's members)
- History/trend UI reads existing `assessment_rounds` — no migration needed
- LinkedIn OAuth is a Supabase provider config change
