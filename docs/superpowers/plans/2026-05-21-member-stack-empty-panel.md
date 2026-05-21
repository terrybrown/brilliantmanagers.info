# MemberStack Empty-State Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure `MemberStack` so clicking "0 people" on an empty node opens the inline member-management panel for org admins.

**Architecture:** Remove the early return that exits before the panel can render. Unify into a single render path where the avatar-stack container shows "0 people" text when empty and avatar circles otherwise; the member panel renders whenever `isAdmin && isOpen` regardless of member count.

**Tech Stack:** React 19, TypeScript, Vitest + @testing-library/react

---

## File Structure

| File | Change |
|------|--------|
| `components/org/MemberStack.tsx` | Remove early return; move "0 people" text inside the unified avatar-stack container |
| `__tests__/components/org/MemberStack.test.tsx` | Add one new failing test that drives the fix |

---

### Task 1: Restructure MemberStack to render the panel in the empty state

**Files:**
- Modify: `components/org/MemberStack.tsx`
- Modify: `__tests__/components/org/MemberStack.test.tsx`

**Context for the implementer:**

`MemberStack` currently has an early return at line 55 when both `members` and `pendingInvites` are empty. That span never renders the member panel. The fix: remove the early return and render "0 people" text as a child of the container `<div>` that already handles the `onClick`/`cursor` for the avatar stack. The member panel condition (`isAdmin && isOpen`) is unchanged — it simply now also fires for the empty case.

The branch for this work is a **new branch off `master`**. Do not add commits to the existing `fix/member-stack-empty-state-clickable` branch (PR #65 is open). Run `npm test` before starting to confirm the baseline is green.

- [ ] **Step 1: Create a new branch off master**

```bash
git checkout master && git pull origin master
git checkout -b fix/member-stack-panel-empty-state
```

- [ ] **Step 2: Confirm baseline tests pass**

```bash
npm test
```

Expected: all tests pass (286 at time of writing).

- [ ] **Step 3: Add the failing test**

In `__tests__/components/org/MemberStack.test.tsx`, add this test inside the existing `describe('MemberStack', ...)` block, after the "does not call onToggle when non-admin clicks '0 people'" test (around line 67):

```tsx
it('shows the add-member form when admin opens the panel on an empty node', () => {
  render(
    <MemberStack
      members={[]}
      pendingInvites={[]}
      nodeId="n1"
      orgId="org-1"
      isAdmin={true}
      isOpen={true}
      onToggle={vi.fn()}
    />
  )
  expect(screen.getByPlaceholderText('Add member by email…')).toBeInTheDocument()
})
```

- [ ] **Step 4: Run the new test to confirm it fails**

```bash
npm test -- --reporter=verbose 2>&1 | grep -E "shows the add-member form|FAIL|pass"
```

Expected: the new test fails with something like `Unable to find an element with the placeholder text: Add member by email…`

- [ ] **Step 5: Rewrite MemberStack.tsx**

Replace the entire contents of `components/org/MemberStack.tsx` with:

```tsx
'use client'
import { useState, useTransition } from 'react'
import {
  addMemberToNodeAction,
  removeMemberFromNodeAction,
  cancelPendingOrgNodeInvitationAction,
} from '@/app/(app)/organisation/actions'
import type { OrgNode } from '@/lib/db/org-nodes'

const AVATAR_COLORS = [
  '#4f46e5', '#0891b2', '#059669', '#7c3aed',
  '#b45309', '#be185d', '#0e7490', '#15803d',
]

function avatarColor(id: string): string {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}

function initials(name: string | null, email: string | null): string {
  const src = name ?? email ?? '?'
  return src.slice(0, 2).toUpperCase()
}

const AVATAR_SIZE = 22
const AVATAR_BORDER = 2
const MAX_VISIBLE = 3

interface MemberStackProps {
  members: OrgNode['members']
  pendingInvites: OrgNode['pendingInvites']
  nodeId: string
  orgId: string
  isAdmin: boolean
  isOpen: boolean
  onToggle: () => void
}

export function MemberStack({
  members,
  pendingInvites,
  nodeId,
  orgId,
  isAdmin,
  isOpen,
  onToggle,
}: MemberStackProps) {
  const [memberError, setMemberError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const isEmpty = members.length === 0 && pendingInvites.length === 0
  const visible = members.slice(0, MAX_VISIBLE)
  const overflow = members.length - MAX_VISIBLE

  return (
    <>
      {/* Avatar stack / empty trigger */}
      <div
        onClick={isAdmin ? onToggle : undefined}
        title={isAdmin ? 'Manage members' : undefined}
        style={{
          display: 'flex',
          alignItems: 'center',
          cursor: isAdmin ? 'pointer' : 'default',
        }}
      >
        {isEmpty ? (
          <span style={{ color: '#4b5563', fontSize: 11 }}>0 people</span>
        ) : (
          <>
            {visible.map((m, i) => (
              <div
                key={m.user_id}
                style={{
                  width: AVATAR_SIZE,
                  height: AVATAR_SIZE,
                  borderRadius: '50%',
                  background: avatarColor(m.user_id),
                  border: `${AVATAR_BORDER}px solid #111827`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 8,
                  color: '#fff',
                  marginLeft: i > 0 ? -6 : 0,
                  flexShrink: 0,
                }}
              >
                {initials(m.display_name, m.email)}
              </div>
            ))}
            {overflow > 0 && (
              <div
                style={{
                  width: AVATAR_SIZE,
                  height: AVATAR_SIZE,
                  borderRadius: '50%',
                  background: '#374151',
                  border: `${AVATAR_BORDER}px solid #111827`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 8,
                  color: '#9ca3af',
                  marginLeft: -6,
                  flexShrink: 0,
                }}
              >
                +{overflow}
              </div>
            )}
            {pendingInvites.length > 0 && (
              <div
                style={{
                  width: AVATAR_SIZE,
                  height: AVATAR_SIZE,
                  borderRadius: '50%',
                  background: 'rgba(99,102,241,0.2)',
                  border: `${AVATAR_BORDER}px solid rgba(99,102,241,0.4)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 8,
                  color: '#a78bfa',
                  flexShrink: 0,
                }}
              >
                {pendingInvites.length}
              </div>
            )}
          </>
        )}
      </div>

      {/* Member panel — admin only, when open */}
      {isAdmin && isOpen && (
        <div
          style={{
            gridColumn: '1 / -1',
            paddingTop: 8,
            paddingBottom: 12,
            paddingLeft: 38,
            paddingRight: 14,
            background: 'rgba(99,102,241,0.04)',
            borderTop: '1px solid rgba(255,255,255,0.04)',
            borderLeft: '2px solid rgba(99,102,241,0.25)',
          }}
        >
          <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.08em', color: '#6b7280', marginBottom: 8 }}>
            Members
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
            {members.map(m => (
              <div
                key={m.user_id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 20, padding: '3px 10px 3px 5px', fontSize: 11, color: '#cbd5e1',
                }}
              >
                <div
                  style={{
                    width: 20, height: 20, borderRadius: '50%',
                    background: avatarColor(m.user_id),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 8, color: '#fff', flexShrink: 0,
                  }}
                >
                  {initials(m.display_name, m.email)}
                </div>
                {m.display_name ?? m.email}
                <form action={removeMemberFromNodeAction} style={{ display: 'inline' }}>
                  <input type="hidden" name="nodeId" value={nodeId} />
                  <input type="hidden" name="userId" value={m.user_id} />
                  <input type="hidden" name="orgId" value={orgId} />
                  <button type="submit" style={{ background: 'none', border: 'none', color: '#4b5563', cursor: 'pointer', fontSize: 12, padding: '0 0 0 4px', lineHeight: 1 }}>
                    ✕
                  </button>
                </form>
              </div>
            ))}

            {pendingInvites.map(invite => (
              <div
                key={invite.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  background: 'rgba(99,102,241,0.08)', border: '1px dashed rgba(99,102,241,0.3)',
                  borderRadius: 20, padding: '3px 10px 3px 8px', fontSize: 11, color: '#a78bfa',
                }}
              >
                {invite.invited_email}
                <span style={{ fontSize: 9, color: '#6366f1', marginLeft: 2 }}>awaiting registration</span>
                <form action={cancelPendingOrgNodeInvitationAction} style={{ display: 'inline' }}>
                  <input type="hidden" name="orgId" value={orgId} />
                  <input type="hidden" name="invitationId" value={invite.id} />
                  <button type="submit" style={{ background: 'none', border: 'none', color: '#4b5563', cursor: 'pointer', fontSize: 12, padding: '0 0 0 4px', lineHeight: 1 }}>
                    ✕
                  </button>
                </form>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 6 }}>
            <form
              style={{ display: 'flex', gap: 6, flex: 1 }}
              action={async (fd) => {
                fd.set('orgId', orgId)
                fd.set('nodeId', nodeId)
                setMemberError(null)
                startTransition(async () => {
                  const result = await addMemberToNodeAction(fd)
                  if (result.error) setMemberError(result.error)
                })
              }}
            >
              <input
                name="email"
                type="email"
                placeholder="Add member by email…"
                disabled={isPending}
                style={{
                  flex: 1, background: '#0d1117', border: '1px solid #1f2937',
                  color: '#f1f5f9', padding: '5px 8px', borderRadius: 4, fontSize: 11,
                  outline: 'none', maxWidth: 280,
                }}
              />
              <button
                type="submit"
                disabled={isPending}
                style={{
                  background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.3)',
                  color: '#a78bfa', padding: '5px 10px', borderRadius: 4, fontSize: 11,
                  cursor: isPending ? 'default' : 'pointer', opacity: isPending ? 0.6 : 1,
                }}
              >
                {isPending ? '…' : 'Add'}
              </button>
            </form>
          </div>
          {memberError && (
            <p style={{ margin: '6px 0 0', fontSize: 11, color: '#ef4444' }}>{memberError}</p>
          )}
        </div>
      )}
    </>
  )
}
```

- [ ] **Step 6: Run all tests and confirm they pass**

```bash
npm test
```

Expected: all tests pass. The new test from Step 3 should now be green. Existing click tests ("calls onToggle when admin clicks '0 people'" and "does not call onToggle when non-admin clicks '0 people'") continue to pass because `fireEvent.click(screen.getByText('0 people'))` clicks the `<span>`, which bubbles up to the container `<div>` where the `onClick` handler lives.

If any tests fail, read the error carefully. The most likely cause is a test asserting on an element that no longer exists (e.g. `getByRole` or `getByTitle` on the old early-return span). Adjust selectors to match the new structure.

- [ ] **Step 7: Commit**

```bash
git add components/org/MemberStack.tsx __tests__/components/org/MemberStack.test.tsx
git commit -m "fix: render member panel for empty nodes by removing early return in MemberStack"
```

- [ ] **Step 8: Push**

```bash
git push -u origin fix/member-stack-panel-empty-state
```
