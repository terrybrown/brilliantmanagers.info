# Spec A — Team & Org: Page Polish + Invite Button

**Date:** 2026-06-06  
**Status:** Approved  
**Scope:** `/people` page only — no database changes

---

## Goal

Surface a prominent "Invite +" entry point in the Topbar for the Team & Org page, replacing the buried inline `AddConnectionForm`. Makes inviting a manager or direct report a first-class action.

---

## What Changes

### 1. Topbar — "Invite +" button

The Topbar already supports a per-page primary action button (see the Tour button on `/dashboard`). Add an "Invite +" button rendered only when `pathname === '/people'`.

- **Label:** `Invite +`
- **Style:** `--btn-primary-bg` / `--btn-primary-fg` (teal fill, white text) — matches the design reference (Image #29)
- **Behaviour:** opens `InviteModal` (new component, see below)
- **Location in `Topbar.tsx`:** right zone, alongside Search and Beta chip

### 2. InviteModal (new component)

A modal dialog triggered by the Invite button. Replaces `AddConnectionForm` as the primary invite UI.

**Fields:**
- **Email** — required, text input, validated client-side for email format
- **Role toggle** — two options: "They are my manager" / "They report to me" (radio or segmented control)
- **Message** — optional textarea ("Add a personal note…")

**Submit behaviour:**
- Calls the existing `inviteConnection` server action (no backend changes)
- On success: shows a toast "Invitation sent", closes modal
- On error: shows the error message inline below the form

**Cancel:** closes modal with no side effects.

**Component location:** `components/people/InviteModal.tsx`

### 3. Remove inline AddConnectionForm

`AddConnectionForm` (`components/people/AddConnectionForm.tsx`) is currently embedded in `YourConnections.tsx`. Remove it — the Topbar button is now the sole entry point for invitations.

The `InviteManagerModal` (manager-only invite, used in the manager empty state) stays — it handles the specific "invite your manager" flow from the manager card.

### 4. Page heading

The page `<h1>` in `page.tsx` currently uses a plain `font-bold` Tailwind class. Update to use `--font-display` (Bricolage Grotesque) at 24px/700 to match the Sage heading style, consistent with other app pages.

---

## Components Touched

| File | Change |
|---|---|
| `components/app/Topbar.tsx` | Add Invite + button for `/people` |
| `components/people/InviteModal.tsx` | New — modal with email, role, message |
| `app/(app)/people/YourConnections.tsx` | Remove `AddConnectionForm` embed |
| `components/people/AddConnectionForm.tsx` | Delete |
| `app/(app)/people/page.tsx` | Update `<h1>` to use display font |

---

## Server Actions

No new server actions. `InviteModal` calls the existing `inviteConnection` action from `app/(app)/connections/actions.ts`.

---

## Error Handling

- Client-side: validate email format before submitting (no empty submit)
- Server-side errors surface as inline form error (not toast) so the user can correct and retry
- Success: toast "Invitation sent" + modal closes

---

## Testing

- Unit test: `InviteModal` renders, submits with valid email, shows error on failure
- Unit test: Topbar renders Invite + button on `/people`, not on other routes
- Update any existing `AddConnectionForm` tests — delete them if the component is removed
