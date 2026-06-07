# Amber Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove all amber-as-brand references from the codebase, replacing them with Sage CSS tokens.

**Architecture:** Pure find-and-fix across 11 files. No logic changes. The `.amber-rule` CSS class already uses `var(--color-accent)` internally — rename it to `.accent-rule` for consistency and update all two call sites. The `.bm-tour-popover` driver.js styles in globals.css also need amber → teal. Email templates are exempt (email client compatibility).

**Tech Stack:** Next.js App Router, Tailwind CSS v4, Sage CSS tokens (`--color-accent`, `--btn-primary-bg`, `--btn-primary-fg`, `--btn-primary-bg-hover`, `--color-accent-wash2`).

---

## File map

| File | Change |
|---|---|
| `app/globals.css` | Rename `.amber-rule` → `.accent-rule`; fix tour popover `#f59e0b` |
| `app/not-found.tsx` | Update `.amber-rule` → `.accent-rule` className |
| `app/the-tool/page.tsx` | Update `.amber-rule` → `.accent-rule` + fix `#f59e0b` inline styles |
| `app/the-tool/JoinNowForm.tsx` | Replace amber button with teal |
| `app/auth/confirm/ConfirmButton.tsx` | Replace amber button + loading dots with teal |
| `app/auth/confirm/page.tsx` | Replace amber link with teal |
| `app/error.tsx` | Replace amber reset button with teal |
| `app/global-error.tsx` | Replace amber reset button with teal |
| `components/ui/button.tsx` | Replace amber focus ring with teal |
| `app/(app)/dr/[userId]/page.tsx` | Replace amber back-links with teal |
| `app/(app)/admin/audit-log/page.tsx` | Replace amber action column with neutral |
| `app/(app)/admin/users/AdminUsersTable.tsx` | Replace amber chip with teal |
| `app/(app)/growth/goal/[id]/page.tsx` | Replace amber chip + inline styles with teal |
| `components/app/GoalCompleteOverlay.tsx` | Replace amber text + button with teal |

---

### Task 1: Fix globals.css

**Files:**
- Modify: `app/globals.css`

- [ ] **Rename `.amber-rule` to `.accent-rule` and fix tour popover styles**

Find the `.amber-rule` block (around line 94) and rename it:

```css
/* ── Accent rule utility ── */
.accent-rule {
  display: block;
  width: 40px;
  height: 2px;
  background-color: var(--color-accent);
  margin-bottom: 12px;
}
```

Find the `.bm-tour-popover` progress text and next-btn rules and update:

```css
.bm-tour-popover .driver-popover-progress-text {
  font-size: 10px !important;
  font-weight: 700 !important;
  color: var(--color-accent) !important;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.bm-tour-popover button.driver-popover-next-btn {
  background: var(--color-accent) !important;
  color: #fff !important;
  border: none !important;
  font-size: 12px !important;
  font-weight: 600 !important;
  border-radius: 6px !important;
  padding: 6px 16px !important;
  cursor: pointer;
  text-shadow: none !important;
  box-shadow: none !important;
}
```

- [ ] **Run full test suite — confirm no regressions**

```bash
cd /Users/terry.brown/work/personal/brilliantmanagers.info && npm test 2>&1 | tail -6
```

Expected: all tests pass.

- [ ] **Commit**

```bash
git add app/globals.css
git commit -m "fix: rename .amber-rule → .accent-rule, fix tour popover amber colours"
```

---

### Task 2: Fix `not-found.tsx` and `app/the-tool/page.tsx`

**Files:**
- Modify: `app/not-found.tsx`
- Modify: `app/the-tool/page.tsx`

- [ ] **Update `not-found.tsx` className**

Find: `<span className="amber-rule mx-auto" />`
Replace with: `<span className="accent-rule mx-auto" />`

- [ ] **Update `app/the-tool/page.tsx` — three changes**

Change 1 — className on hero amber rule (line 78):
```tsx
// Before:
<span className="amber-rule" />
// After:
<span className="accent-rule" />
```

Change 2 — em text in hero (line 90):
```tsx
// Before:
<em style={{ color: '#f59e0b' }}>Know where to grow.</em>
// After:
<em style={{ color: 'var(--color-accent)' }}>Know where to grow.</em>
```

Change 3 — "Start for free" box border (line ~109):
```tsx
// Before:
border: '1px solid rgba(245,158,11,0.30)',
borderTop: '3px solid #f59e0b',
// After:
border: '1px solid rgba(14,124,107,0.30)',
borderTop: '3px solid var(--color-accent)',
```

Change 4 — offline spreadsheet link (line ~142):
```tsx
// Before:
style={{ color: '#f59e0b' }}
// After:
style={{ color: 'var(--color-accent)' }}
```

Change 5 — bullet point arrows (line ~224):
```tsx
// Before:
<span style={{ color: '#f59e0b', flexShrink: 0, marginTop: 2 }}>→</span>
// After:
<span style={{ color: 'var(--color-accent)', flexShrink: 0, marginTop: 2 }}>→</span>
```

- [ ] **Run tests**

```bash
npm test 2>&1 | tail -6
```

- [ ] **Commit**

```bash
git add app/not-found.tsx app/the-tool/page.tsx
git commit -m "fix: replace amber accent with teal in not-found and the-tool pages"
```

---

### Task 3: Fix `JoinNowForm.tsx` and auth/confirm files

**Files:**
- Modify: `app/the-tool/JoinNowForm.tsx`
- Modify: `app/auth/confirm/ConfirmButton.tsx`
- Modify: `app/auth/confirm/page.tsx`

- [ ] **Fix `JoinNowForm.tsx` — amber button**

Find:
```tsx
style={{ background: '#f59e0b', color: '#1a3a5c' }}
```
Replace with:
```tsx
style={{ background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-fg)' }}
```

- [ ] **Fix `ConfirmButton.tsx` — amber loading dots and button**

Replace the entire file content:

```tsx
'use client'
import { useFormStatus } from 'react-dom'

export function ConfirmButton() {
  const { pending } = useFormStatus()

  if (pending) {
    return (
      <div className="flex w-full items-end justify-center gap-1.5 px-4 py-3">
        <span className="block h-3 w-3 animate-tall-bounce rounded-full" style={{ background: 'var(--color-accent-wash)', animationDelay: '0ms' }} />
        <span className="block h-3 w-3 animate-tall-bounce rounded-full" style={{ background: 'var(--color-accent-wash2)', animationDelay: '150ms' }} />
        <span className="block h-3 w-3 animate-tall-bounce rounded-full" style={{ background: 'var(--color-accent-border)', animationDelay: '300ms' }} />
        <span className="block h-3 w-3 animate-tall-bounce rounded-full" style={{ background: 'var(--color-accent)', animationDelay: '450ms' }} />
      </div>
    )
  }

  return (
    <button
      type="submit"
      className="flex w-full items-center justify-center rounded-lg px-4 py-3 text-sm font-semibold"
      style={{ background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-fg)' }}
    >
      Sign in →
    </button>
  )
}
```

- [ ] **Fix `app/auth/confirm/page.tsx` — amber link**

Find:
```tsx
className="text-sm font-semibold text-amber-500 hover:text-amber-400"
```
Replace with:
```tsx
style={{ color: 'var(--color-accent)', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}
```
(Remove the `className` prop entirely on that `<Link>`.)

Also fix the slate-500 text colours in that page to use Sage tokens. Find:
```tsx
<p className="mb-6 text-slate-500">
```
Replace with:
```tsx
<p className="mb-6" style={{ color: 'var(--color-text-muted)' }}>
```
And:
```tsx
<p className="mb-6 text-slate-500">Click below to sign in to Brilliant Managers.</p>
```
Replace with:
```tsx
<p className="mb-6" style={{ color: 'var(--color-text-muted)' }}>Click below to sign in to Brilliant Managers.</p>
```

- [ ] **Run tests**

```bash
npm test 2>&1 | tail -6
```

- [ ] **Commit**

```bash
git add app/the-tool/JoinNowForm.tsx app/auth/confirm/ConfirmButton.tsx app/auth/confirm/page.tsx
git commit -m "fix: replace amber with teal in JoinNowForm and auth/confirm pages"
```

---

### Task 4: Fix error pages and `components/ui/button.tsx`

**Files:**
- Modify: `app/error.tsx`
- Modify: `app/global-error.tsx`
- Modify: `components/ui/button.tsx`

- [ ] **Fix `app/error.tsx`**

Find:
```tsx
<button onClick={reset} className="text-sm text-amber-500 underline">
```
Replace with:
```tsx
<button onClick={reset} className="text-sm underline" style={{ color: 'var(--color-accent)' }}>
```

- [ ] **Fix `app/global-error.tsx`**

Find in the button style:
```tsx
color: '#f59e0b',
```
Replace with:
```tsx
color: 'var(--color-accent)',
```

- [ ] **Fix `components/ui/button.tsx` — focus ring**

Find in the `cva` base string:
```
focus-visible:ring-amber-400
```
Replace with:
```
focus-visible:ring-[var(--color-accent)]
```

- [ ] **Run tests**

```bash
npm test 2>&1 | tail -6
```

- [ ] **Commit**

```bash
git add app/error.tsx app/global-error.tsx components/ui/button.tsx
git commit -m "fix: replace amber focus ring and error page colours with teal"
```

---

### Task 5: Fix app-route amber references

**Files:**
- Modify: `app/(app)/dr/[userId]/page.tsx`
- Modify: `app/(app)/admin/audit-log/page.tsx`
- Modify: `app/(app)/admin/users/AdminUsersTable.tsx`
- Modify: `app/(app)/growth/goal/[id]/page.tsx`
- Modify: `components/app/GoalCompleteOverlay.tsx`

- [ ] **Fix `dr/[userId]/page.tsx` — amber back-links**

Find (appears twice):
```tsx
<Link href="/dashboard" className="mb-4 block text-sm text-amber-400 hover:text-amber-300">
```
Replace both with:
```tsx
<Link href="/dashboard" className="mb-4 block text-sm" style={{ color: 'var(--color-accent)' }}>
```

- [ ] **Fix `admin/audit-log/page.tsx` — amber action column**

Find:
```tsx
<td className="px-3 py-2 font-mono text-amber-400">{entry.action}</td>
```
Replace with:
```tsx
<td className="px-3 py-2 font-mono" style={{ color: 'var(--color-text-primary)' }}>{entry.action}</td>
```

- [ ] **Fix `admin/users/AdminUsersTable.tsx` — amber chip**

Find:
```tsx
<span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-semibold text-amber-400">
```
Replace with:
```tsx
<span className="rounded-full px-2 py-0.5 text-xs font-semibold" style={{ background: 'var(--color-accent-wash2)', color: 'var(--color-accent)' }}>
```

- [ ] **Fix `growth/goal/[id]/page.tsx` — three amber references**

Read the file first to find exact line context, then:

Change 1 — amber chip (around line 44):
```tsx
// Before:
<span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-semibold text-amber-400">
// After:
<span className="rounded-full px-2 py-0.5 text-xs font-semibold" style={{ background: 'var(--color-accent-wash2)', color: 'var(--color-accent)' }}>
```

Change 2 — inline style with amber (around line 52):
```tsx
// Before:
: { background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }
// After:
: { background: 'var(--color-accent-wash2)', color: 'var(--color-accent)' }
```

Change 3 — hover:text-amber-300 (around line 102):
```tsx
// Before:
className="text-sm font-medium text-white hover:text-amber-300"
// After:
className="text-sm font-medium text-white hover:opacity-80"
```

- [ ] **Fix `GoalCompleteOverlay.tsx` — amber text and button**

Change 1 — "Goal complete" label:
```tsx
// Before:
<p className="text-xs font-semibold uppercase tracking-widest text-amber-400">
// After:
<p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-accent)' }}>
```

Change 2 — "achieved." span:
```tsx
// Before:
<span className="text-amber-400">achieved.</span>
// After:
<span style={{ color: 'var(--color-accent)' }}>achieved.</span>
```

Change 3 — "View completed goals" button:
```tsx
// Before:
className="rounded-lg bg-amber-500 px-5 py-2 text-sm font-semibold text-white hover:bg-amber-400"
// After:
className="rounded-lg px-5 py-2 text-sm font-semibold" style={{ background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-fg)' }}
```

- [ ] **Run full test suite**

```bash
npm test 2>&1 | tail -6
```

- [ ] **Run build to confirm no TypeScript errors**

```bash
npm run build 2>&1 | grep -E "error TS|Type error|✓ Compiled|Failed" | head -5
```

Expected: `✓ Compiled successfully`.

- [ ] **Commit**

```bash
git add 'app/(app)/dr/[userId]/page.tsx' 'app/(app)/admin/audit-log/page.tsx' 'app/(app)/admin/users/AdminUsersTable.tsx' 'app/(app)/growth/goal/[id]/page.tsx' components/app/GoalCompleteOverlay.tsx
git commit -m "fix: replace amber-as-brand with teal across app routes"
```

---

### Final: push and open PR

```bash
git push -u origin fix/amber-audit
gh pr create \
  --title "fix: remove all amber-as-brand references — replace with Sage teal" \
  --body "Replaces all hardcoded amber/\`#f59e0b\` brand colours with Sage CSS tokens throughout the codebase. Covers auth/confirm, error pages, the-tool, not-found, admin, growth goal, GoalCompleteOverlay, and the shadcn Button focus ring. Also renames .amber-rule to .accent-rule in globals.css and fixes tour popover colours. Legitimate manager data-series amber (charts, checkin state) is unchanged." \
  --base master --assignee "@me"
```
