# Fix Organisations — Design Spec

**Date:** 2026-05-31  
**Scope:** Two independent fixes to the org/people feature: (1) admin page query bug, (2) org hierarchy action button redesign.

---

## 1. Admin Organisations Page — Empty Results Bug

### Problem

`/admin/organisations` shows "No organisations yet" even though orgs exist. The page uses `createAdminClient()` (service-role key, bypasses RLS — correct), but the Supabase PostgREST query uses a nested join:

```ts
supabase.from('organisations').select(
  'id, name, created_at, org_members(role, profiles(email, display_name)), org_nodes(id)'
)
```

`org_members.user_id` has a FK to `auth.users(id)`. `profiles.id` also has a FK to `auth.users(id)`. There is **no direct FK between `org_members` and `profiles`**, so PostgREST cannot resolve the `org_members → profiles` join. The query errors silently (`const { data } = await supabase…` discards the error), `data` is null, `data ?? []` yields `[]`, and the table renders the empty state.

### Fix

Replace the single nested query with two sequential queries:

1. Fetch all orgs + member count + node count from `organisations`, `org_members`, `org_nodes` (no profile join).
2. For each org, fetch member user IDs, then fetch matching profiles in a single `IN` query.

Merge the results in application code before passing to `AdminOrgsTable`.

Alternatively, add a DB-level FK `org_members.user_id → profiles.id` via migration and rely on PostgREST join resolution — but this couples two tables that are currently independently keyed to `auth.users`. The application-code merge is cleaner and avoids a migration.

### AdminOrgsTable changes

None required — the `OrgRow` shape already expects a `profiles` sub-object on each `org_member`. The fix is purely in the server component query logic.

---

## 2. Org Hierarchy — Action Button Redesign (Option B)

### Problem

- The "+ child" button is `fontSize: 10` and visually tiny.
- The member management trigger is the "0 people" gray text span — it has no button affordance and is not discoverable. This confusion caused a user to accidentally create org nodes named with email addresses instead of inviting members.
- Both admin actions are easy to confuse or miss.

### Design

**Admin node row layout (left → right):**

```
[▾/spacer]  [Node name]  [avatar stack]  [+ People]  [+ Subgroup]
```

- **Avatar stack** remains unchanged — passive member indicator for all users. Sits to the left of the action buttons.
- **`+ People` button** — replaces the "0 people" click target.
  - Label: `+ People` when 0 members; `N people ▾` when members exist; `N people ▴` when panel is open.
  - Pending invites: append `·N pending` to the label when there are pending invites.
  - Color: emerald tint — `rgba(16,185,129,0.15)` bg, `#34d399` text, `rgba(16,185,129,0.3)` border.
  - `fontSize: 13`, `padding: '4px 10px'`, `borderRadius: 5`.
  - Admin only. Clicking opens/closes the existing MemberStack panel.
- **`+ Subgroup` button** — replaces the `+ child` button.
  - Label: `+ Subgroup` idle; `+ Subgroup ▴` when child form is open.
  - Color: indigo tint — `rgba(99,102,241,0.15)` bg, `#a78bfa` text, `rgba(99,102,241,0.3)` border (same palette as before, just larger).
  - `fontSize: 13`, `padding: '4px 10px'`, `borderRadius: 5`.
  - Admin only. Clicking opens/closes the existing inline AddNodeForm.

**Node name:** bumped from `13px` to `14px`; depth-0 bold stays bold.

**Non-admin view:** unchanged — avatar stack only, no action buttons.

### Architectural note — panel placement

`MemberStack` currently renders the member panel as a fragment sibling to the avatar stack div, which makes it a flex item inside the node row. The `gridColumn: '1/-1'` style on the panel is a leftover from a grid design that never landed; in the current flex row it has no effect. As part of this redesign, the panel moves **out of MemberStack** and into `NodeRow`, placed after the flex row div — the same pattern used by `AddNodeForm`. This fixes the latent layout bug at the same time.

### Files affected

| File | Change |
|---|---|
| `components/org/NodeRow.tsx` | Replace `+ child` button with `+ Subgroup`; add `+ People` button; render member panel below the flex row (extracted from MemberStack) |
| `components/org/MemberStack.tsx` | Reduce to avatar stack display only — remove click handler, remove panel rendering, remove `isOpen`/`onToggle` props |

### What does NOT change

- The MemberStack panel content (member chips, pending invite chips, Add member form) — layout and behaviour unchanged.
- The AddNodeForm (child group creation form) — unchanged.
- The OrgHierarchy top-level "Add group" form — unchanged.
- Non-admin rendering — unchanged.
- All server actions — unchanged.

---

## Out of scope

- Fixing org invite emails: the email code is correct. The confusion was purely UX (wrong input used). The button redesign resolves the root cause.
- Any changes to org membership model, RLS policies, or DB schema.
- Renaming or deleting nodes via the UI (separate roadmap item).
