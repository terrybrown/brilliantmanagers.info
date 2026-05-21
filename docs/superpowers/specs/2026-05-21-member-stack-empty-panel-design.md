# MemberStack Empty-State Panel — Design

**Goal:** Allow org admins to open the member management panel on a node with zero members and zero pending invites.

**Root cause of the bug:** `MemberStack` returns early when both counts are zero, rendering only a `<span>`. The member panel lives in the non-early-return branch, so `isOpen` becoming `true` has no visible effect.

---

## Design

Restructure `MemberStack` to use a single unified render path. Remove the early return.

### Avatar stack container

The outer `<div>` that wraps the avatar circles becomes the single interactive trigger:

- `onClick={isAdmin ? onToggle : undefined}` — same as today for non-empty nodes
- `cursor: pointer` when `isAdmin`, `default` otherwise

Inside the container:

- **When empty** (zero members, zero pending): render `<span style="color:#4b5563;fontSize:11">0 people</span>`
- **When non-empty**: render avatar circles, overflow count, and pending-invite bubble — unchanged from current behaviour

### Member panel

Renders whenever `isAdmin && isOpen` — no change to the condition. With zero members and zero pending invites, the chips section is simply empty and only the add-by-email form is visible.

### States

| members | pendingInvites | isAdmin | isOpen | What renders |
|---------|----------------|---------|--------|--------------|
| 0 | 0 | false | any | "0 people" span, no click |
| 0 | 0 | true | false | "0 people" span, clickable |
| 0 | 0 | true | true | "0 people" span, clickable + panel (form only) |
| >0 or >0 | — | false | any | avatar stack, no click |
| >0 or >0 | — | true | false | avatar stack, clickable |
| >0 or >0 | — | true | true | avatar stack, clickable + panel |

### Files

- Modify: `components/org/MemberStack.tsx`
- Modify: `__tests__/components/org/MemberStack.test.tsx`

### Tests to update

The two tests added in PR #65 ("calls onToggle when admin clicks '0 people'" and "does not call onToggle when non-admin clicks '0 people'") targeted the early-return span. After the restructure, those tests remain valid — the assertions are the same, the element that receives the click changes from a `<span>` to a `<div>` container, but `getByText('0 people')` still finds it.

No new tests needed beyond ensuring existing coverage still passes.
