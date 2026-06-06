# Team & Org — Invite Button Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Surface a prominent "Invite +" button in the Topbar for the `/people` page, backed by a modal that reuses the existing `inviteConnection` server action.

**Architecture:** New `InviteModal` component (email + role toggle + optional message) triggers from a Topbar button visible only on `/people`. The existing `inviteConnection` action from `app/(app)/connections/actions.ts` handles both in-platform and new-user invite paths with no backend changes.

**Tech Stack:** React, Next.js App Router, existing `useMutation` hook, existing `inviteConnection` server action, Sage design tokens.

---

## File map

| File | Action |
|---|---|
| `components/people/InviteModal.tsx` | Create |
| `components/app/Topbar.tsx` | Modify — add Invite + button for `/people` |
| `components/people/AddConnectionForm.tsx` | Delete |
| `__tests__/components/people/AddConnectionForm.test.tsx` | Delete |
| `__tests__/components/people/InviteModal.test.tsx` | Create |
| `app/(app)/people/page.tsx` | Modify — update h1 to display font |

---

### Task 1: Create InviteModal component

**Files:**
- Create: `components/people/InviteModal.tsx`
- Create: `__tests__/components/people/InviteModal.test.tsx`

- [ ] **Write the failing test**

```typescript
// __tests__/components/people/InviteModal.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { InviteModal } from '@/components/people/InviteModal'

vi.mock('@/app/(app)/connections/actions', () => ({
  inviteConnection: vi.fn().mockResolvedValue({ ok: true }),
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

describe('InviteModal', () => {
  it('renders trigger button', () => {
    render(<InviteModal />)
    expect(screen.getByRole('button', { name: /invite/i })).toBeTruthy()
  })

  it('opens modal on trigger click', () => {
    render(<InviteModal />)
    fireEvent.click(screen.getByRole('button', { name: /invite/i }))
    expect(screen.getByRole('heading', { name: /invite someone/i })).toBeTruthy()
  })

  it('shows email input, role options, and optional message field', () => {
    render(<InviteModal />)
    fireEvent.click(screen.getByRole('button', { name: /invite/i }))
    expect(screen.getByPlaceholderText(/email/i)).toBeTruthy()
    expect(screen.getByLabelText(/direct report/i)).toBeTruthy()
    expect(screen.getByLabelText(/manager/i)).toBeTruthy()
    expect(screen.getByPlaceholderText(/personal note/i)).toBeTruthy()
  })

  it('closes on backdrop click', () => {
    render(<InviteModal />)
    fireEvent.click(screen.getByRole('button', { name: /invite/i }))
    const backdrop = screen.getByTestId('modal-backdrop')
    fireEvent.click(backdrop)
    expect(screen.queryByRole('heading', { name: /invite someone/i })).toBeNull()
  })
})
```

- [ ] **Run test — expect FAIL (InviteModal not yet defined)**

```bash
cd /Users/terry.brown/work/personal/brilliantmanagers.info && npm test -- InviteModal 2>&1 | tail -10
```

- [ ] **Create the component**

```typescript
// components/people/InviteModal.tsx
'use client'

import { useState } from 'react'
import { inviteConnection } from '@/app/(app)/connections/actions'
import { useMutation } from '@/hooks/use-mutation'
import { Button } from '@/components/ui/button'

interface Props {
  trigger?: React.ReactNode
}

export function InviteModal({ trigger }: Props) {
  const [open, setOpen] = useState(false)
  const { mutate, isPending } = useMutation({
    onSuccess: () => setOpen(false),
  })

  return (
    <>
      <div onClick={() => setOpen(true)}>
        {trigger ?? (
          <button
            type="button"
            style={{
              background: 'var(--btn-primary-bg)',
              color: 'var(--btn-primary-fg)',
              border: 'none',
              borderRadius: 8,
              padding: '7px 16px',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            Invite +
          </button>
        )}
      </div>

      {open && (
        <div
          data-testid="modal-backdrop"
          style={{
            position: 'fixed', inset: 0, zIndex: 50,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 16,
          }}
          onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}
        >
          <div
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              boxShadow: 'var(--shadow-modal)',
              borderRadius: 12,
              padding: 28,
              width: '100%',
              maxWidth: 460,
            }}
          >
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 20,
                fontWeight: 700,
                color: 'var(--color-text-primary)',
                marginBottom: 4,
              }}
            >
              Invite someone
            </h2>
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 20 }}>
              We&apos;ll send them an email. They&apos;ll need to sign up if they&apos;re not already on Brilliant Managers.
            </p>

            <form
              onSubmit={e => {
                e.preventDefault()
                const fd = new FormData(e.currentTarget)
                mutate(() => inviteConnection(fd))
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
            >
              <div>
                <label
                  style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 6 }}
                >
                  Their email address
                </label>
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="colleague@company.com"
                  style={{
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 6,
                    padding: '8px 12px',
                    color: 'var(--color-text-primary)',
                    fontSize: 13,
                    width: '100%',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label
                  style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 8 }}
                >
                  They are…
                </label>
                <div style={{ display: 'flex', gap: 10 }}>
                  <label
                    style={{
                      flex: 1, display: 'flex', alignItems: 'center', gap: 8,
                      padding: '8px 12px',
                      border: '1px solid var(--color-border)',
                      borderRadius: 7, cursor: 'pointer', fontSize: 13,
                      color: 'var(--color-text-primary)',
                    }}
                  >
                    <input type="radio" name="role" value="direct_report" defaultChecked />
                    My direct report
                  </label>
                  <label
                    style={{
                      flex: 1, display: 'flex', alignItems: 'center', gap: 8,
                      padding: '8px 12px',
                      border: '1px solid var(--color-border)',
                      borderRadius: 7, cursor: 'pointer', fontSize: 13,
                      color: 'var(--color-text-primary)',
                    }}
                  >
                    <input type="radio" name="role" value="manager" />
                    My manager
                  </label>
                </div>
              </div>

              <div>
                <label
                  style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 6 }}
                >
                  Personal note{' '}
                  <span style={{ color: 'var(--color-text-faint)', fontWeight: 400 }}>(optional)</span>
                </label>
                <textarea
                  name="message"
                  rows={3}
                  placeholder="Add a personal note to your invite…"
                  style={{
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 6,
                    padding: '8px 12px',
                    color: 'var(--color-text-primary)',
                    fontSize: 13,
                    width: '100%',
                    resize: 'vertical',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <Button type="submit" loading={isPending} className="flex-1">
                  Send invite
                </Button>
                <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
```

- [ ] **Run tests — expect PASS**

```bash
npm test -- InviteModal 2>&1 | tail -10
```

Expected: all 4 tests pass.

- [ ] **Commit**

```bash
git add components/people/InviteModal.tsx __tests__/components/people/InviteModal.test.tsx
git commit -m "feat: add InviteModal component — email, role toggle, optional message"
```

---

### Task 2: Add Invite + button to Topbar

**Files:**
- Modify: `components/app/Topbar.tsx`

The Topbar already imports `usePathname` and conditionally renders the Tour button for `/dashboard`. Follow the same pattern for `/people`.

- [ ] **Read current Topbar structure** — confirm it imports `usePathname` and renders a Tour button block.

- [ ] **Add the import and button**

In `components/app/Topbar.tsx`, add the InviteModal import and the button inside the right zone div, right after the Tour button block:

```typescript
// Add at top with other imports:
import { InviteModal } from '@/components/people/InviteModal'
```

Inside the right zone `<div>`, after the Tour button block and before the Beta chip:

```typescript
{pathname === '/people' && (
  <InviteModal />
)}
```

- [ ] **Verify the Topbar test still passes**

```bash
npm test -- Topbar 2>&1 | tail -10
```

- [ ] **Run the full test suite**

```bash
npm test 2>&1 | tail -6
```

Expected: all tests pass.

- [ ] **Commit**

```bash
git add components/app/Topbar.tsx
git commit -m "feat: show Invite + button in Topbar on /people"
```

---

### Task 3: Delete AddConnectionForm

`AddConnectionForm` is not currently imported anywhere — only the component file and its test exist. Delete both.

**Files:**
- Delete: `components/people/AddConnectionForm.tsx`
- Delete: `__tests__/components/people/AddConnectionForm.test.tsx`

- [ ] **Delete files**

```bash
rm /Users/terry.brown/work/personal/brilliantmanagers.info/components/people/AddConnectionForm.tsx
rm /Users/terry.brown/work/personal/brilliantmanagers.info/__tests__/components/people/AddConnectionForm.test.tsx
```

- [ ] **Run the full test suite — confirm nothing breaks**

```bash
npm test 2>&1 | tail -6
```

Expected: tests pass (fewer tests than before — the deleted tests are gone).

- [ ] **Commit**

```bash
git add -A
git commit -m "chore: delete AddConnectionForm — replaced by InviteModal"
```

---

### Task 4: Update page h1 to display font

**Files:**
- Modify: `app/(app)/people/page.tsx`

- [ ] **Update the h1**

Find the h1 in `page.tsx`:

```typescript
// Current:
<h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 750, color: 'var(--color-text-primary)', letterSpacing: '-0.02em', margin: '0 0 4px' }}>
```

It already uses `var(--font-display)`. Confirm visually that it matches the Sage heading style (24px, 750 weight). If it does, no change needed here — skip this task.

If the h1 uses Tailwind classes instead:
```typescript
// Replace with:
<h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, color: 'var(--color-text-primary)', margin: '0 0 4px' }}>
  Team &amp; Org
</h1>
```

- [ ] **Run full test suite**

```bash
npm test 2>&1 | tail -6
```

- [ ] **Commit (if changed)**

```bash
git add app/\(app\)/people/page.tsx
git commit -m "style: use display font for Team & Org page h1"
```

---

### Final: push branch and open PR

```bash
git push -u origin design/team-org-redesign
gh pr create --title "feat: Team & Org — Invite + Topbar button" \
  --body "Adds a prominent Invite + button in the Topbar for /people. Opens InviteModal (email, role toggle, optional message) which calls the existing inviteConnection action. Removes the unused AddConnectionForm." \
  --base master --assignee "@me"
```
