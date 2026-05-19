# Team & Org Consolidation — Design Spec

**Date:** 2026-05-19
**Status:** Approved

## Overview

Consolidate the existing "Connections" (`/connections`) and "Organisation" (`/organisation`) navigation items into a single "Team & Org" page at `/people`. Simultaneously, replace the dashboard "Invite your manager" link with an inline modal, and enhance the Super Admin organisations table with additional metadata.

---

## 1. Navigation Changes

- Remove the "Connections" and "Organisation" nav items.
- Add a single "Team & Org" nav item (icon: `Network` or similar) pointing to `/people`.
- The existing `/connections` and `/organisation` routes can redirect to `/people` for backwards compatibility.
- Super Admin sidebar item "Organisations" remains as-is in the admin section.

---

## 2. /people Page — Layout

Single-scroll page with two vertically stacked sections separated by a divider:

1. **Your Connections** (top)
2. **Organisation** (bottom)

A global "+ Add connection" button sits in the page header (opens the existing invite flow — email + role selector).

---

## 3. Your Connections Section

### 3a. Pending Sub-section

- Shown only when there are pending incoming invitations.
- Collapsible (expanded by default when pending invites exist).
- Header: amber "Pending" label + count badge.
- Each pending invite: amber dashed-border card with avatar initials, name, email, relationship description ("wants to connect as your direct report" / "wants to connect as your manager"), and **Accept** / **Decline** buttons.
- On accept: connection status → active; card moves into the appropriate active sub-section.
- On decline: connection removed; card disappears.

### 3b. "You report to" Sub-section

- Always visible.
- Label: "You report to" (uppercase, muted).
- **When a manager is connected (active):** indigo-tinted card showing avatar, display name, email, "Connected" badge.
- **When an invite is pending (outbound):** indigo-tinted card showing the invited email, "Pending — waiting for them to accept" badge. No second invite can be sent while one is pending.
- **When no manager connected:** indigo-tinted card with muted empty state + inline "Invite your manager" CTA button (opens the invite modal — see §5).

### 3c. "Your direct reports" Sub-section

- Always visible.
- Label: "Your direct reports (N)" showing count.
- **When no direct reports:** muted empty state text ("No direct reports yet").
- **Each direct report card** shows:
  - Avatar (initials), display name, email
  - Round status: "In progress" (green) / "Scheduled" (blue) / "None scheduled" (muted)
  - Last score (numeric, muted label)
  - Next scheduled date (or "—" if none)
  - Manager-scored indicator: "✓ Done" (green) or "⚠ Not yet" (amber)

---

## 4. Organisation Section

### 4a. No Org State

If the user is not a member of any organisation, show the existing "Create organisation" flow (unchanged from current implementation).

### 4b. Org Header

- "Organisation" section label (uppercase, indigo) with the org name as a pill badge on the right.
- If the user belongs to multiple orgs, show the existing org-picker tabs.

### 4c. Hierarchy Tree

Replaces the full current Organisation page hierarchy. Rendered as an indented tree of org nodes.

**All users (member + org_admin):**
- See each node's name.
- See headcount per node ("N people").
- Can collapse/expand child nodes using the ▾/▸ toggle.

**Org admins only:**
- "See members" button on each node — expands an inline member list showing avatars + display names.
- Existing node management controls (add child node, rename, delete) remain accessible (either inline or via an edit mode toggle).

**Non-admins:**
- No "See members" button — headcount only.
- No node management controls.

### 4d. Members Panel

The current standalone Members panel (right column on the existing Organisation page) is retired from this view. Member management (promote/demote org_admin, remove member) moves to a dedicated settings sub-page or modal — out of scope for this spec, to be designed separately.

---

## 5. Dashboard — "Invite your manager" Modal

The existing "Invite your manager" action card on the dashboard currently navigates to `/connections`. Replace the navigation with an inline modal.

**Modal contents:**
- Title: "Invite your manager"
- Short explainer: "We'll send them an email so they can connect and score your reflections."
- **Email field** (required) — their work email
- **Personal message field** (optional, textarea, ~3 rows) — pre-filled placeholder: "Hi — I've been using Brilliant Managers to track my development. I'd love your perspective on my reflections."
- **Send invite** button (primary)
- **Cancel** button

**On submit:**
- Calls the existing `inviteConnection()` server action with `role: 'manager'`.
- Shows a success state: "Invite sent to [email]" with a close button.
- The manager appears in the "You report to" sub-section on `/people` with status "Pending".

---

## 6. Email Template — Manager Invite

A new Mailgun transactional email for manager invitations (sent via the existing `MAILGUN_API_KEY` / `MAILGUN_SENDING_KEY` infrastructure, not a Supabase auth template). Design principles: warm, brief, action-oriented.

**Subject:** `[Name] has invited you to support their development`

**Body structure:**
1. Greeting: "Hi there,"
2. Context: "[Name] is using Brilliant Managers to track their management effectiveness. They've invited you to be their manager so you can score their reflections and help them grow."
3. Personal message block (if provided): shown in a quoted/indented style.
4. CTA button: "Accept invitation" → links to the app (auth flow if not logged in, accept-connection flow once authed).
5. Footer: "If you weren't expecting this, you can safely ignore it."

The template must use the existing Mailgun sending infrastructure (`MAILGUN_API_KEY`, `MAILGUN_SENDING_KEY`, `MAILGUN_BASE_URL`) and match the dark visual style of existing transactional emails.

---

## 7. Super Admin — Organisations Table

The existing `/admin/organisations` table gains additional columns:

| Column | Description |
|---|---|
| Name | Org name (existing) |
| Created by | Display name of founding user (existing) |
| Created date | `created_at` formatted (existing) |
| Members | Total member count (existing) |
| Org admins | Display names of all users with `org_admin` role in this org |
| Nodes | Count of `org_nodes` rows for this org |
| Last activity | Most recent `created_at` across all `scorecard_rounds` for any user in this org |

Last activity requires a join: `scorecard_rounds` → `users` → `org_members` filtered by org. This can be a `LEFT JOIN` — orgs with no rounds show "No activity".

---

## 8. Routing & Redirects

| Old route | New route | Notes |
|---|---|---|
| `/connections` | `/people` | 301 redirect |
| `/organisation` | `/people` | 301 redirect |
| `/people` | new | Server component, replaces both pages |

Middleware `APP_ROUTES` list updated to include `/people` and remove `/connections` and `/organisation`.

---

## 9. Data Requirements

All data needed for `/people` is already available through existing query functions:

- `getConnectionsForUser(userId)` — connections as manager + as direct report
- `getAllCompleteRoundsWithScores(userId)` — for last score per direct report (requires per-user lookup)
- `getScheduledRound(userId)` — next scheduled date per direct report
- `getInProgressRound(userId)` — current round status per direct report
- `getOrgsForUser(userId)` — org membership
- `getNodesForOrg(orgId)` — hierarchy
- `getOrgRole(userId, orgId)` — determines member vs admin view

The direct report round data requires N+1 queries (one per direct report) unless a batch query is added. A new `getDirectReportRoundSummaries(managerUserId)` server function should be written to fetch all direct report round data in one query.

---

## 10. Out of Scope

- Member management (promote/demote, remove) UI changes — retained as-is or deferred
- Multiple org support UX changes — org picker tabs retained as-is
- Mobile-specific layout optimisations — responsive but not a primary target
