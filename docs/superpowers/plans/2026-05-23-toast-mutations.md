# Toast Notifications + Consistent Mutation UX — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Install Sonner toast notifications, migrate all server actions to return `ActionResult`, add a `useMutation` hook, standardise the `Button` component with CSS-token-driven variants and a dots loading state, and wire every mutation on the site to show loading + error/success feedback.

**Architecture:** All server actions return `ActionResult<T> = { ok: true; data?: T } | { ok: false; error: string }`. Client components call them via a `useMutation` hook that wraps `useTransition`, calls `toast.error` on failure, and optionally calls `toast.success` on success. The `Button` component gains a `loading` prop that hides its label and shows three bouncing dots, preserving layout width.

**Tech Stack:** Next.js 15 App Router, React 19, Sonner (shadcn), Vitest + @testing-library/react, Tailwind CSS v4, CVA (class-variance-authority).

---

## File Map

**New files:**
- `lib/action-result.ts` — `ActionResult<T>` type + `ok()` / `err()` helpers
- `hooks/use-mutation.ts` — `useMutation` hook
- `__tests__/hooks/use-mutation.test.ts` — hook unit tests
- `components/profile/ProfileForm.tsx` — client form split from server-rendered profile page

**Modified files:**
- `app/globals.css` — button CSS custom properties + `@keyframes dotBounce` + `.dot-1/2/3`
- `components/ui/button.tsx` — `loading` prop, new variants (primary/secondary/ghost/danger)
- `app/(app)/layout.tsx` — add `<Toaster>`
- `app/(app)/profile/actions.ts` — all 4 actions → `ActionResult`
- `app/(app)/profile/page.tsx` — use `ProfileForm`
- `app/(app)/growth/actions.ts` — all 5 actions → `ActionResult`
- `app/(app)/reflections/actions.ts` — 2 actions → `ActionResult`
- `app/(app)/notifications/actions.ts` — 1 action → `ActionResult`
- `app/(app)/connections/actions.ts` — remove `InviteState`, remove `prevState`, both actions → `ActionResult`
- `app/(app)/organisation/actions.ts` — all actions → `ActionResult`, remove `addMemberToNodeVoidAction`
- `app/(app)/scorecard/actions.ts` — `saveScore` → `ActionResult<{ roundCompleted: boolean }>`
- `app/(app)/manager/[userId]/actions.ts` — `saveManagerScore` → `ActionResult`
- `app/(app)/admin/organisations/actions.ts` — `deleteOrgAction` → `ActionResult`
- `app/(app)/admin/users/actions.ts` — both actions → `ActionResult`
- `components/profile/BlindScoringToggle.tsx` — use `useMutation`
- `components/app/AvatarUpload.tsx` — replace local toast state with Sonner
- `components/app/GoalForm.tsx` — use `useMutation` + `Button`
- `components/app/EvidenceLog.tsx` — use `useMutation` + `Button`
- `components/app/GoalDetailClient.tsx` — use `useMutation` for resource pin/unpin
- `components/reflections/CreateRoundModal.tsx` — use `useMutation` + `Button`
- `app/(app)/people/YourConnections.tsx` — use `useMutation` for accept connection
- `components/people/AddConnectionForm.tsx` — replace `useActionState` with `useMutation`
- `components/people/InviteManagerModal.tsx` — replace `useActionState` with `useMutation`
- `app/(app)/people/OrgSection.tsx` — use `useMutation` for create org
- `components/org/OrgHierarchy.tsx` — add `toast.error` on `createNodeAction` failure
- `components/org/MemberStack.tsx` — use `useMutation` for member actions
- `components/app/scorecard/SkillList.tsx` — add `toast.error` on `saveScore` failure
- `components/app/ManagerScoringView.tsx` — add `toast.error` on `saveManagerScore` failure
- `app/(app)/admin/users/page.tsx` — extract `AdminUsersTable` client component
- `app/(app)/admin/organisations/page.tsx` — extract `AdminOrgsTable` client component

---

### Task 1: Confirm baseline test suite is green

**Files:** none

- [ ] **Run tests**

```bash
npm test
```

Expected: all tests pass. If any fail, do not continue — investigate and fix first.

- [ ] **Commit** — nothing to commit; this is a checkpoint only.

---

### Task 2: Install Sonner and add Toaster to the authenticated layout

**Files:**
- Modify: `app/(app)/layout.tsx`

- [ ] **Install Sonner via shadcn**

```bash
npx shadcn@latest add sonner
```

Accept any prompts. This installs the `sonner` package and creates `components/ui/sonner.tsx`.

- [ ] **Add Toaster to the authenticated app shell**

Open `app/(app)/layout.tsx`. Add the import and `<Toaster>` inside the layout's JSX, after the main content wrapper.

The file currently ends its body element near the sidebar layout. Add after the existing imports:

```tsx
import { Toaster } from '@/components/ui/sonner'
```

Then inside the returned JSX, add `<Toaster position="bottom-right" theme="dark" />` as the last child before the closing tag of the outermost `<div>` or `<body>`.

- [ ] **Run tests**

```bash
npm test
```

Expected: all tests still pass.

- [ ] **Commit**

```bash
git add -A
git commit -m "feat: install Sonner and add Toaster to authenticated shell"
```

---

### Task 3: Create ActionResult type and helpers

**Files:**
- Create: `lib/action-result.ts`
- Create: `__tests__/lib/action-result.test.ts`

- [ ] **Write the failing test**

Create `__tests__/lib/action-result.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { ok, err, type ActionResult } from '@/lib/action-result'

describe('ok', () => {
  it('returns ok:true with no data', () => {
    const result: ActionResult = ok()
    expect(result).toEqual({ ok: true, data: undefined })
  })

  it('returns ok:true with data', () => {
    const result: ActionResult<number> = ok(42)
    expect(result).toEqual({ ok: true, data: 42 })
  })
})

describe('err', () => {
  it('returns ok:false with the error string', () => {
    const result: ActionResult = err('Something went wrong')
    expect(result).toEqual({ ok: false, error: 'Something went wrong' })
  })
})
```

- [ ] **Run to confirm failure**

```bash
npm test -- action-result
```

Expected: FAIL — cannot find module `@/lib/action-result`.

- [ ] **Implement the type and helpers**

Create `lib/action-result.ts`:

```ts
export type ActionResult<T = void> =
  | { ok: true; data?: T }
  | { ok: false; error: string }

export function ok<T>(data?: T): ActionResult<T> {
  return { ok: true, data }
}

export function err(error: string): ActionResult<never> {
  return { ok: false, error }
}
```

- [ ] **Run to confirm passing**

```bash
npm test -- action-result
```

Expected: PASS.

- [ ] **Commit**

```bash
git add lib/action-result.ts __tests__/lib/action-result.test.ts
git commit -m "feat: add ActionResult type with ok/err helpers"
```

---

### Task 4: Add button CSS tokens and dot animation to globals.css

**Files:**
- Modify: `app/globals.css`

- [ ] **Add CSS custom properties and keyframe animation**

Open `app/globals.css`. After the closing `}` of the existing `@theme` block, add the following. These use `:root` (not `@theme`) because they're plain CSS properties referenced via `var()`, not Tailwind utility tokens.

```css
/* ── Button colour tokens — change one value to retheme all buttons ── */
:root {
  --btn-primary-bg: #f59e0b;
  --btn-primary-bg-hover: #fbbf24;
  --btn-primary-fg: #1a2a3a;
  --btn-secondary-border: #334155;
  --btn-secondary-fg: #94a3b8;
  --btn-danger-bg: rgba(239, 68, 68, 0.15);
  --btn-danger-border: rgba(239, 68, 68, 0.3);
  --btn-danger-fg: #f87171;
}

/* ── Dots loading animation ── */
@keyframes dotBounce {
  0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
  40%           { transform: translateY(-5px); opacity: 1; }
}
.dot-1 { animation: dotBounce 1.1s infinite ease-in-out; }
.dot-2 { animation: dotBounce 1.1s 0.16s infinite ease-in-out; }
.dot-3 { animation: dotBounce 1.1s 0.32s infinite ease-in-out; }
```

- [ ] **Run tests**

```bash
npm test
```

Expected: all tests pass (CSS changes don't affect unit tests).

- [ ] **Commit**

```bash
git add app/globals.css
git commit -m "feat: add button CSS tokens and dot-bounce loading animation"
```

---

### Task 5: Enhance Button component with loading prop and new variants

**Files:**
- Modify: `components/ui/button.tsx`

The existing shadcn `Button` has generic shadcn variants. No app code currently imports `Button` from `@/components/ui/button` — all existing buttons use raw `<button>` elements. So the variants can be safely replaced.

- [ ] **Replace the button component**

Overwrite `components/ui/button.tsx` with:

```tsx
import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary:
          'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] hover:bg-[var(--btn-primary-bg-hover)]',
        secondary:
          'border border-[var(--btn-secondary-border)] bg-transparent text-[var(--btn-secondary-fg)] hover:text-white',
        ghost:
          'bg-transparent text-slate-400 hover:text-white',
        danger:
          'border border-[var(--btn-danger-border)] bg-[var(--btn-danger-bg)] text-[var(--btn-danger-fg)] hover:opacity-80',
      },
      size: {
        default: 'px-5 py-2.5',
        sm: 'px-3 py-1.5 text-xs',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        <span className={cn('contents', loading && 'opacity-0 pointer-events-none')}>
          {children}
        </span>
        {loading && (
          <span
            className="absolute inset-0 flex items-center justify-center gap-1"
            aria-hidden="true"
          >
            <span className="dot-1 h-1.5 w-1.5 rounded-full bg-current" />
            <span className="dot-2 h-1.5 w-1.5 rounded-full bg-current" />
            <span className="dot-3 h-1.5 w-1.5 rounded-full bg-current" />
          </span>
        )}
      </Comp>
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
```

- [ ] **Run tests**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Commit**

```bash
git add components/ui/button.tsx
git commit -m "feat: add loading prop and CSS-token-driven variants to Button"
```

---

### Task 6: Create useMutation hook and tests

**Files:**
- Create: `hooks/use-mutation.ts`
- Create: `__tests__/hooks/use-mutation.test.ts`

- [ ] **Write the failing tests**

Create `__tests__/hooks/use-mutation.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useMutation } from '@/hooks/use-mutation'

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

import { toast } from 'sonner'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useMutation', () => {
  it('starts not pending', () => {
    const { result } = renderHook(() => useMutation())
    expect(result.current.isPending).toBe(false)
  })

  it('calls toast.success with string message on ok result', async () => {
    const { result } = renderHook(() => useMutation({ onSuccess: 'Done!' }))
    await act(async () => {
      result.current.mutate(() => Promise.resolve({ ok: true as const }))
    })
    expect(toast.success).toHaveBeenCalledWith('Done!')
    expect(toast.error).not.toHaveBeenCalled()
  })

  it('calls toast.error with error string on not-ok result', async () => {
    const { result } = renderHook(() => useMutation())
    await act(async () => {
      result.current.mutate(() => Promise.resolve({ ok: false as const, error: 'Oops' }))
    })
    expect(toast.error).toHaveBeenCalledWith('Oops')
    expect(toast.success).not.toHaveBeenCalled()
  })

  it('calls onSuccess callback with data when ok', async () => {
    const onSuccess = vi.fn()
    const { result } = renderHook(() => useMutation<string>({ onSuccess }))
    await act(async () => {
      result.current.mutate(() => Promise.resolve({ ok: true as const, data: 'hello' }))
    })
    expect(onSuccess).toHaveBeenCalledWith('hello')
  })

  it('calls onError callback with error string when not ok', async () => {
    const onError = vi.fn()
    const { result } = renderHook(() => useMutation({ onError }))
    await act(async () => {
      result.current.mutate(() => Promise.resolve({ ok: false as const, error: 'bad' }))
    })
    expect(onError).toHaveBeenCalledWith('bad')
  })

  it('does not call toast.success when onSuccess is not provided', async () => {
    const { result } = renderHook(() => useMutation())
    await act(async () => {
      result.current.mutate(() => Promise.resolve({ ok: true as const }))
    })
    expect(toast.success).not.toHaveBeenCalled()
  })
})
```

- [ ] **Run to confirm failure**

```bash
npm test -- use-mutation
```

Expected: FAIL — cannot find module `@/hooks/use-mutation`.

- [ ] **Implement the hook**

Create `hooks/use-mutation.ts`:

```ts
'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'
import type { ActionResult } from '@/lib/action-result'

interface MutationOptions<T> {
  onSuccess?: string | ((data?: T) => void)
  onError?: (error: string) => void
}

export function useMutation<T = void>(options?: MutationOptions<T>) {
  const [isPending, startTransition] = useTransition()

  function mutate(action: () => Promise<ActionResult<T>>) {
    startTransition(async () => {
      const result = await action()
      if (!result.ok) {
        toast.error(result.error)
        options?.onError?.(result.error)
        return
      }
      if (typeof options?.onSuccess === 'string') {
        toast.success(options.onSuccess)
      } else if (typeof options?.onSuccess === 'function') {
        options.onSuccess(result.data)
      }
    })
  }

  return { mutate, isPending }
}
```

- [ ] **Run to confirm passing**

```bash
npm test -- use-mutation
```

Expected: all 6 tests PASS.

- [ ] **Run full suite**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Commit**

```bash
git add hooks/use-mutation.ts __tests__/hooks/use-mutation.test.ts
git commit -m "feat: add useMutation hook with Sonner toast integration"
```

---

### Task 7: Migrate profile/actions.ts to ActionResult

**Files:**
- Modify: `app/(app)/profile/actions.ts`

All 4 exported functions return `void` or `{ error?: string }`. They become `ActionResult`.

- [ ] **Update the file**

Replace the entire content of `app/(app)/profile/actions.ts` with:

```ts
'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { updateProfile } from '@/lib/db/profiles'
import { logAudit } from '@/lib/audit'
import { ok, err, type ActionResult } from '@/lib/action-result'

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const EXT_MAP: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}
const MAX_BYTES = 2 * 1024 * 1024

export async function updateProfileAction(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return err('Not authenticated')

  const display_name = (formData.get('display_name') as string).trim()
  const job_title = (formData.get('job_title') as string).trim()
  const bio = (formData.get('bio') as string).trim()

  const { error } = await updateProfile(user.id, { display_name, job_title, bio })
  if (error) return err('Failed to save profile. Please try again.')

  await logAudit({
    actorId: user.id,
    action: 'profile.update',
    entityType: 'profile',
    entityId: user.id,
  })
  revalidatePath('/profile')
  return ok()
}

export async function uploadAvatarAction(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const avatarFile = formData.get('avatar') as File | null
  if (!avatarFile || avatarFile.size === 0) return err('No file selected.')
  if (!ALLOWED_MIME_TYPES.has(avatarFile.type)) return err('Avatar must be a JPEG, PNG, or WebP image.')
  if (avatarFile.size > MAX_BYTES) return err('Avatar must be 2 MB or smaller.')

  const ext = EXT_MAP[avatarFile.type]
  const path = `${user.id}/avatar.${ext}`
  const bytes = new Uint8Array(await avatarFile.arrayBuffer())

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, bytes, { contentType: avatarFile.type, upsert: true })
  if (uploadError) return err(uploadError.message)

  await updateProfile(user.id, { avatar_path: path })
  revalidatePath('/profile')
  return ok()
}

export async function removeAvatarAction(): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const paths = ['jpg', 'png', 'webp'].map(ext => `${user.id}/avatar.${ext}`)
  const { error: storageError } = await supabase.storage.from('avatars').remove(paths)
  if (storageError) {
    console.error('removeAvatarAction storage error:', storageError)
    return err(storageError.message)
  }

  await updateProfile(user.id, { avatar_path: null })
  revalidatePath('/profile')
  return ok()
}

export async function updateBlindScoringAction(value: boolean): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { error } = await updateProfile(user.id, { manager_scoring_blind: value })
  if (error) return err('Failed to update preference')

  await logAudit({
    actorId: user.id,
    action: 'profile.update_blind_scoring',
    entityType: 'profile',
    entityId: user.id,
    metadata: { manager_scoring_blind: value },
  })
  revalidatePath('/profile')
  return ok()
}
```

> **Note on `updateProfile`:** The existing `updateProfile` function in `lib/db/profiles.ts` may or may not return `{ error }`. Check its signature — if it throws on error (no return value), wrap the call in `try/catch` and `return err(e instanceof Error ? e.message : 'Failed')` instead. Adjust the pattern accordingly.

- [ ] **Run tests**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Commit**

```bash
git add app/\(app\)/profile/actions.ts
git commit -m "feat: migrate profile actions to ActionResult"
```

---

### Task 8: Migrate growth/actions.ts to ActionResult

**Files:**
- Modify: `app/(app)/growth/actions.ts`

- [ ] **Update the file**

Replace `app/(app)/growth/actions.ts` with:

```ts
'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { upsertPlan, markPlanComplete, updateLastCheckin } from '@/lib/db/development-plans'
import { bulkAddGoalResources, addGoalResource, removeGoalResource } from '@/lib/db/goal-resources'
import { addEvidence } from '@/lib/db/goal-evidence'
import { logAudit } from '@/lib/audit'
import { ok, err, type ActionResult } from '@/lib/action-result'

async function getAuthenticatedUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  return user
}

export async function saveGoalAction(formData: FormData): Promise<ActionResult> {
  const user = await getAuthenticatedUser()

  const skill_key = formData.get('skill_key') as string
  const pillar = formData.get('pillar') as string
  const goal = formData.get('goal') as string
  const target_date = (formData.get('target_date') as string) || null
  const checkin_raw = formData.get('checkin_frequency_weeks') as string
  const checkin_frequency_weeks = checkin_raw ? parseInt(checkin_raw, 10) : null
  const resource_ids_raw = formData.get('resource_ids') as string

  if (!skill_key || !pillar || !goal) return err('Missing required fields.')

  let plan: { id: string }
  try {
    plan = await upsertPlan(user.id, {
      skill_key,
      pillar,
      goal,
      target_date,
      status: 'planned',
      checkin_frequency_weeks,
    })
  } catch {
    return err('Failed to save goal. Please try again.')
  }

  if (resource_ids_raw) {
    const resource_ids: string[] = JSON.parse(resource_ids_raw)
    await bulkAddGoalResources(plan.id, resource_ids, user.id)
  }

  await logAudit({
    actorId: user.id,
    action: 'goal.create',
    entityType: 'goal',
    entityId: plan.id,
    metadata: { skill_key, pillar },
  })

  revalidatePath('/growth')
  redirect(`/growth/goal/${plan.id}`)
}

export async function markGoalCompleteAction(planId: string): Promise<ActionResult> {
  const user = await getAuthenticatedUser()
  try {
    await markPlanComplete(planId)
  } catch {
    return err('Failed to mark goal complete.')
  }
  await logAudit({
    actorId: user.id,
    action: 'goal.complete',
    entityType: 'goal',
    entityId: planId,
  })
  revalidatePath('/growth')
  revalidatePath(`/growth/goal/${planId}`)
  return ok()
}

export async function addEvidenceAction(formData: FormData): Promise<ActionResult> {
  const user = await getAuthenticatedUser()

  const plan_id = formData.get('plan_id') as string
  const what_you_did = formData.get('what_you_did') as string
  const impact = formData.get('impact') as string
  const url = (formData.get('url') as string) || null

  if (!plan_id || !what_you_did || !impact) return err('Missing required fields.')

  try {
    await addEvidence(plan_id, user.id, { what_you_did, impact, url })
    await updateLastCheckin(plan_id)
  } catch {
    return err('Failed to add evidence. Please try again.')
  }

  await logAudit({
    actorId: user.id,
    action: 'goal.evidence.add',
    entityType: 'goal_evidence',
    entityId: plan_id,
  })

  revalidatePath(`/growth/goal/${plan_id}`)
  return ok()
}

export async function addGoalResourceAction(planId: string, resourceId: string): Promise<ActionResult> {
  await getAuthenticatedUser()
  try {
    await addGoalResource(planId, resourceId, (await getAuthenticatedUser()).id)
  } catch {
    return err('Failed to update resources.')
  }
  revalidatePath(`/growth/goal/${planId}`)
  return ok()
}

export async function removeGoalResourceAction(planId: string, resourceId: string): Promise<ActionResult> {
  await getAuthenticatedUser()
  try {
    await removeGoalResource(planId, resourceId)
  } catch {
    return err('Failed to update resources.')
  }
  revalidatePath(`/growth/goal/${planId}`)
  return ok()
}
```

> **Note on `addGoalResourceAction`/`removeGoalResourceAction`:** The current code calls `getAuthenticatedUser()` twice in `addGoalResourceAction`. Refactor to call it once and reuse the result.

Actually, update `addGoalResourceAction` to:
```ts
export async function addGoalResourceAction(planId: string, resourceId: string): Promise<ActionResult> {
  const user = await getAuthenticatedUser()
  try {
    await addGoalResource(planId, resourceId, user.id)
  } catch {
    return err('Failed to update resources.')
  }
  revalidatePath(`/growth/goal/${planId}`)
  return ok()
}
```

- [ ] **Run tests**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Commit**

```bash
git add app/\(app\)/growth/actions.ts
git commit -m "feat: migrate growth actions to ActionResult"
```

---

### Task 9: Migrate reflections, notifications, scorecard, and manager actions

**Files:**
- Modify: `app/(app)/reflections/actions.ts`
- Modify: `app/(app)/notifications/actions.ts`
- Modify: `app/(app)/scorecard/actions.ts`
- Modify: `app/(app)/manager/[userId]/actions.ts`

- [ ] **Update reflections/actions.ts**

```ts
'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createRound } from '@/lib/db/rounds'
import { createNotification } from '@/lib/notifications'
import { ok, err, type ActionResult } from '@/lib/action-result'

export async function createRoundAction(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const title = (formData.get('title') as string) || 'Reflection'
  const notes = (formData.get('notes') as string) || null
  const remindAt = (formData.get('remind_at') as string) || null

  try {
    await createRound(user.id, title, notes, remindAt)
  } catch {
    return err('Failed to create round. Please try again.')
  }

  redirect('/scorecard')
}

export async function scheduleRoundAction(
  userId: string,
  scheduledDate: string
): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return err('Unauthenticated')

  if (user.id !== userId) {
    const { data: conn } = await supabase
      .from('connections')
      .select('id')
      .eq('manager_id', user.id)
      .eq('direct_report_id', userId)
      .eq('status', 'active')
      .maybeSingle()
    if (!conn) return err('Forbidden')
  }

  const { data: existing } = await supabase
    .from('assessment_rounds')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'scheduled')
    .maybeSingle()

  if (existing) return ok()

  const { error } = await supabase
    .from('assessment_rounds')
    .insert({ user_id: userId, status: 'scheduled' })

  if (error) return err(error.message)

  await createNotification(userId, 'round_scheduled', { scheduledDate })
  return ok()
}
```

- [ ] **Update notifications/actions.ts**

```ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { markAllRead } from '@/lib/notifications'
import { ok, err, type ActionResult } from '@/lib/action-result'

export async function markAllReadAction(): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return err('Not authenticated')
  try {
    await markAllRead(user.id)
  } catch {
    return err('Failed to mark notifications as read.')
  }
  return ok()
}
```

- [ ] **Update scorecard/actions.ts**

```ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { upsertScore } from '@/lib/db/scores'
import { maybeCompleteRound } from '@/lib/db/rounds'
import { logAudit } from '@/lib/audit'
import { getConnectionsForUser } from '@/lib/db/connections'
import { createNotification } from '@/lib/notifications'
import { sendManagerScoringNeededEmail } from '@/lib/email/notifications'
import { ok, err, type ActionResult } from '@/lib/action-result'
import type { Level } from '@/lib/skills'

export async function saveScore(
  roundId: string,
  pillar: string,
  skillKey: string,
  level: Level
): Promise<ActionResult<{ roundCompleted: boolean }>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return err('Not authenticated')

  try {
    await upsertScore(roundId, pillar, skillKey, level)
  } catch {
    return err('Failed to save score. Please try again.')
  }

  const roundCompleted = await maybeCompleteRound(roundId)

  if (roundCompleted) {
    const { asDirectReport } = await getConnectionsForUser(user.id)
    const activeManagerConn = asDirectReport.find(c => c.status === 'active')
    if (activeManagerConn) {
      const managerId = activeManagerConn.manager_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', user.id)
        .single()
      const displayName = profile?.display_name ?? user.email ?? 'Your direct report'
      await createNotification(managerId, 'manager_scoring_needed', {
        directReportId: user.id,
        directReportName: displayName,
        roundId,
      })
      void sendManagerScoringNeededEmail(managerId, displayName)
    }
  }

  await logAudit({
    actorId: user.id,
    action: 'scorecard.submit',
    entityType: 'score',
    entityId: roundId,
    metadata: { pillar, skillKey, level },
  })

  return ok({ roundCompleted })
}
```

- [ ] **Update manager/[userId]/actions.ts**

```ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { upsertManagerScore } from '@/lib/db/manager-scores'
import { logAudit } from '@/lib/audit'
import { ok, err, type ActionResult } from '@/lib/action-result'
import type { Level } from '@/lib/skills'

export async function saveManagerScore(
  roundId: string,
  pillar: string,
  skillKey: string,
  level: Level
): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return err('Not authenticated')

  try {
    await upsertManagerScore(roundId, user.id, skillKey, level)
  } catch {
    return err('Failed to save score. Please try again.')
  }

  await logAudit({
    actorId: user.id,
    action: 'manager_score.submit',
    entityType: 'manager_score',
    entityId: roundId,
    metadata: { pillar, skillKey, level },
  })
  return ok()
}
```

- [ ] **Run tests**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Commit**

```bash
git add app/\(app\)/reflections/actions.ts app/\(app\)/notifications/actions.ts app/\(app\)/scorecard/actions.ts "app/(app)/manager/[userId]/actions.ts"
git commit -m "feat: migrate reflections, notifications, scorecard and manager actions to ActionResult"
```

---

### Task 10: Migrate connections/actions.ts

**Files:**
- Modify: `app/(app)/connections/actions.ts`

`inviteConnection` currently accepts `(_prevState: InviteState, formData: FormData)` for `useActionState`. Remove `prevState`, remove the `InviteState` export, and return `ActionResult`.

- [ ] **Update the file**

Replace `app/(app)/connections/actions.ts` with:

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createConnection, acceptConnection, NO_ACCOUNT_ERROR } from '@/lib/db/connections'
import { createPendingInvitation } from '@/lib/db/pending-invitations'
import { propagateOrgNodeInvitesOnAccept } from '@/lib/db/pending-org-node-invitations'
import { logAudit } from '@/lib/audit'
import { sendEmail } from '@/lib/email/mailgun'
import { buildManagerInviteEmail } from '@/lib/email/templates/manager-invite'
import { buildConnectionInviteEmail } from '@/lib/email/templates/connection-invite'
import { createNotification } from '@/lib/notifications'
import { ok, err, type ActionResult } from '@/lib/action-result'

async function getDisplayName(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  fallback: string
): Promise<string> {
  const { data } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', userId)
    .single()
  return data?.display_name ?? fallback
}

export async function inviteConnection(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return err('Not authenticated')

  const email = formData.get('email') as string
  const role = formData.get('role') as 'manager' | 'direct_report'
  const message = (formData.get('message') as string | null) ?? ''

  const { error, managerId, directReportId } = await createConnection({
    initiatorId: user.id,
    otherEmail: email,
    initiatorRole: role,
  })

  if (error === NO_ACCOUNT_ERROR) {
    const { error: inviteError } = await createPendingInvitation({
      inviterId: user.id,
      invitedEmail: email,
      inviterRole: role,
    })
    if (inviteError) return err(inviteError)

    const fromName = await getDisplayName(supabase, user.id, user.email ?? 'A colleague')
    const { subject, html } = buildConnectionInviteEmail({
      fromName,
      inviterRole: role,
      personalMessage: message || undefined,
    })
    try {
      await sendEmail({ to: email, subject, html })
    } catch (e) {
      console.error('Connection invite email failed:', e)
    }

    await logAudit({
      actorId: user.id,
      action: 'connection.invite_pending',
      entityType: 'pending_invitation',
      metadata: { otherEmail: email, inviterRole: role },
    })

    revalidatePath('/people')
    return ok()
  }

  if (error) return err(error)

  const otherUserId = role === 'manager' ? directReportId : managerId
  if (otherUserId) {
    const fromName = await getDisplayName(supabase, user.id, user.email ?? 'A colleague')
    await createNotification(otherUserId, 'connection_request_received', {
      requesterId: user.id,
      requesterName: fromName,
    })
  }

  await logAudit({
    actorId: user.id,
    action: 'connection.create',
    entityType: 'connection',
    metadata: { otherEmail: email, initiatorRole: role },
  })

  if (role === 'direct_report') {
    const fromName = await getDisplayName(supabase, user.id, user.email ?? 'A colleague')
    const { subject, html } = buildManagerInviteEmail({
      fromName,
      toEmail: email,
      personalMessage: message || undefined,
    })
    try {
      await sendEmail({ to: email, subject, html })
    } catch (e) {
      console.error('Manager invite email failed:', e)
    }
  }

  revalidatePath('/people')
  return ok()
}

export async function acceptConnectionAction(connectionId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return err('Not authenticated')

  try {
    await acceptConnection(connectionId)
  } catch {
    return err('Failed to accept connection.')
  }

  const { data: conn } = await supabase
    .from('connections')
    .select('initiated_by')
    .eq('id', connectionId)
    .single()

  if (conn && conn.initiated_by !== user.id) {
    const acceptorName = await getDisplayName(supabase, user.id, user.email ?? 'A colleague')
    await createNotification(conn.initiated_by, 'connection_accepted', {
      acceptorId: user.id,
      acceptorName,
    })
  }

  if (conn && user.email) {
    try {
      await propagateOrgNodeInvitesOnAccept(conn.initiated_by, user.email)
    } catch (e) {
      console.error('org invite propagation failed:', e)
    }
  }

  await logAudit({
    actorId: user.id,
    action: 'connection.accept',
    entityType: 'connection',
    entityId: connectionId,
  })

  revalidatePath('/people')
  return ok()
}
```

- [ ] **Run tests**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Commit**

```bash
git add app/\(app\)/connections/actions.ts
git commit -m "feat: migrate connections actions to ActionResult, remove InviteState"
```

---

### Task 11: Migrate organisation/actions.ts and admin actions

**Files:**
- Modify: `app/(app)/organisation/actions.ts`
- Modify: `app/(app)/admin/organisations/actions.ts`
- Modify: `app/(app)/admin/users/actions.ts`

- [ ] **Update organisation/actions.ts**

Add `import { ok, err, type ActionResult } from '@/lib/action-result'` at the top.

Change every `Promise<void>` and `Promise<{ error?: string }>` return type to `Promise<ActionResult>`. The pattern for each function:

```ts
// Before:
export async function createOrgAction(formData: FormData): Promise<void> {
  const user = await getUser()
  const name = (formData.get('name') as string).trim()
  if (!name) return
  const org = await createOrg(name)
  await logAudit(...)
  revalidatePath('/people')
}

// After:
export async function createOrgAction(formData: FormData): Promise<ActionResult> {
  const user = await getUser()
  const name = (formData.get('name') as string).trim()
  if (!name) return err('Organisation name is required.')
  try {
    const org = await createOrg(name)
    await logAudit({ actorId: user.id, action: 'org.create', entityType: 'organisation', entityId: org.id, metadata: { name } })
  } catch {
    return err('Failed to create organisation. Please try again.')
  }
  revalidatePath('/people')
  return ok()
}
```

Apply the same pattern to all 10 functions in this file:
- `createOrgAction` → `ActionResult`
- `updateOrgNameAction` → `ActionResult`
- `createNodeAction` → `ActionResult`
- `renameNodeAction` → `ActionResult`
- `deleteNodeAction` → `ActionResult`
- `addMemberToNodeAction` → `ActionResult` (already returns `{ error? }` — convert to `ok()`/`err()`)
- `cancelPendingOrgNodeInvitationAction` → `ActionResult`
- `removeMemberFromNodeAction` → `ActionResult`
- `promoteMemberAction` → `ActionResult`
- `demoteMemberAction` → `ActionResult`

**Remove `addMemberToNodeVoidAction`** entirely — it is defined but never used in any component.

Also update the `getUser()` helper: when `!user`, currently calls `redirect('/login')`. Keep this — it throws before any return, so TypeScript is satisfied.

- [ ] **Update admin/organisations/actions.ts**

```ts
'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { isSuperAdmin } from '@/lib/auth/roles'
import { createAdminClient } from '@/lib/supabase/admin'
import { logAudit } from '@/lib/audit'
import { ok, err, type ActionResult } from '@/lib/action-result'

export async function deleteOrgAction(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const admin = await isSuperAdmin(user.id)
  if (!admin) redirect('/dashboard')

  const orgId = formData.get('orgId') as string
  if (!orgId) return err('Missing org ID.')

  const adminClient = createAdminClient()
  const { error } = await adminClient.from('organisations').delete().eq('id', orgId)
  if (error) return err(error.message)

  await logAudit({
    actorId: user.id,
    action: 'org.delete',
    entityType: 'organisation',
    entityId: orgId,
  })
  revalidatePath('/admin/organisations')
  return ok()
}
```

- [ ] **Update admin/users/actions.ts**

```ts
'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { isSuperAdmin } from '@/lib/auth/roles'
import { grantSuperAdmin, revokeSuperAdmin } from '@/lib/db/user-roles'
import { logAudit } from '@/lib/audit'
import { ok, err, type ActionResult } from '@/lib/action-result'

async function requireSuperAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const admin = await isSuperAdmin(user.id)
  if (!admin) redirect('/dashboard')
  return user
}

export async function grantSuperAdminAction(formData: FormData): Promise<ActionResult> {
  const actor = await requireSuperAdmin()
  const userId = formData.get('userId') as string
  if (!userId) return err('Missing user ID.')
  try {
    await grantSuperAdmin(userId, actor.id)
  } catch {
    return err('Failed to grant admin role.')
  }
  await logAudit({
    actorId: actor.id,
    action: 'role.grant',
    entityType: 'user_role',
    entityId: userId,
    metadata: { role: 'super_admin' },
  })
  revalidatePath('/admin/users')
  return ok()
}

export async function revokeSuperAdminAction(formData: FormData): Promise<ActionResult> {
  const actor = await requireSuperAdmin()
  const userId = formData.get('userId') as string
  if (!userId || userId === actor.id) return err('Cannot revoke your own admin role.')
  try {
    await revokeSuperAdmin(userId)
  } catch {
    return err('Failed to revoke admin role.')
  }
  await logAudit({
    actorId: actor.id,
    action: 'role.revoke',
    entityType: 'user_role',
    entityId: userId,
    metadata: { role: 'super_admin' },
  })
  revalidatePath('/admin/users')
  return ok()
}
```

- [ ] **Run tests**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Commit**

```bash
git add app/\(app\)/organisation/actions.ts app/\(app\)/admin/organisations/actions.ts app/\(app\)/admin/users/actions.ts
git commit -m "feat: migrate organisation and admin actions to ActionResult"
```

---

### Task 12: Split ProfileForm and migrate profile page

**Files:**
- Create: `components/profile/ProfileForm.tsx`
- Modify: `app/(app)/profile/page.tsx`

`app/(app)/profile/page.tsx` is a server component. The form fields must move to a client component to use `useMutation`.

- [ ] **Create `components/profile/ProfileForm.tsx`**

```tsx
'use client'

import { useRef } from 'react'
import { Button } from '@/components/ui/button'
import { useMutation } from '@/hooks/use-mutation'
import { updateProfileAction } from '@/app/(app)/profile/actions'

interface ProfileFormProps {
  displayName: string
  jobTitle: string
  bio: string
  email: string
}

export function ProfileForm({ displayName, jobTitle, bio, email }: ProfileFormProps) {
  const formRef = useRef<HTMLFormElement>(null)
  const { mutate, isPending } = useMutation({ onSuccess: 'Profile saved' })

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    mutate(() => updateProfileAction(formData))
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
          Display name
        </label>
        <input
          name="display_name"
          type="text"
          defaultValue={displayName}
          required
          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
          Job title
        </label>
        <input
          name="job_title"
          type="text"
          defaultValue={jobTitle}
          placeholder="e.g. Engineering Manager"
          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
          Bio
        </label>
        <textarea
          name="bio"
          rows={4}
          defaultValue={bio}
          placeholder="A short description about yourself..."
          className="w-full resize-none rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
          Email
        </label>
        <input
          type="email"
          value={email}
          disabled
          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-500"
        />
      </div>

      <Button type="submit" loading={isPending} className="self-start">
        Save changes
      </Button>
    </form>
  )
}
```

- [ ] **Update `app/(app)/profile/page.tsx`**

Replace the `<form>` block and submit button with `<ProfileForm>`:

```tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getProfile, getSignedAvatarUrl } from '@/lib/db/profiles'
import { getConnectionsForUser } from '@/lib/db/connections'
import { AvatarUpload } from '@/components/app/AvatarUpload'
import { BlindScoringToggle } from '@/components/profile/BlindScoringToggle'
import { ProfileForm } from '@/components/profile/ProfileForm'

function getInitials(name: string | null, email: string | null): string {
  const src = name ?? email ?? '?'
  const parts = src.split(/[\s@]/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return src.slice(0, 2).toUpperCase()
}

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [profile, connections] = await Promise.all([
    getProfile(user.id),
    getConnectionsForUser(user.id),
  ])
  const avatarUrl = profile?.avatar_path
    ? await getSignedAvatarUrl(profile.avatar_path)
    : null
  const initials = getInitials(profile?.display_name ?? null, user.email ?? null)
  const hasDirectReports = connections.asManager.some(c => c.status === 'active')

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-2 text-2xl font-bold text-white">Profile</h1>
      <p className="mb-8 text-sm text-slate-400">
        Update your display name, job title, and bio.
      </p>

      <AvatarUpload initialAvatarUrl={avatarUrl} initials={initials} />

      <ProfileForm
        displayName={profile?.display_name ?? ''}
        jobTitle={profile?.job_title ?? ''}
        bio={profile?.bio ?? ''}
        email={user.email ?? ''}
      />

      {hasDirectReports && (
        <section className="mt-8 border-t border-neutral-800 pt-8">
          <h2 className="mb-4 text-lg font-semibold">Manager preferences</h2>
          <BlindScoringToggle initialValue={profile?.manager_scoring_blind ?? false} />
        </section>
      )}
    </div>
  )
}
```

- [ ] **Run tests**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Commit**

```bash
git add components/profile/ProfileForm.tsx app/\(app\)/profile/page.tsx
git commit -m "feat: split ProfileForm client component and wire useMutation"
```

---

### Task 13: Migrate BlindScoringToggle and AvatarUpload

**Files:**
- Modify: `components/profile/BlindScoringToggle.tsx`
- Modify: `components/app/AvatarUpload.tsx`

- [ ] **Update BlindScoringToggle**

```tsx
'use client'

import { useState } from 'react'
import { Switch } from '@/components/ui/switch'
import { updateBlindScoringAction } from '@/app/(app)/profile/actions'
import { useMutation } from '@/hooks/use-mutation'

export function BlindScoringToggle({ initialValue }: { initialValue: boolean }) {
  const [enabled, setEnabled] = useState(initialValue)
  const { mutate } = useMutation({ onSuccess: 'Preference saved' })

  function handleChange(value: boolean) {
    setEnabled(value)
    mutate(() => updateBlindScoringAction(value))
  }

  return (
    <div className="flex items-start gap-3">
      <Switch
        checked={enabled}
        onCheckedChange={handleChange}
        aria-label="Blind scoring mode"
      />
      <div>
        <p className="text-sm font-medium">Blind scoring</p>
        <p className="text-xs text-neutral-400 mt-0.5">
          {enabled
            ? "You won't see your direct report's self-assessment while scoring."
            : "You'll see your direct report's self-assessment while scoring."}
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Update AvatarUpload**

`AvatarUpload` has its own mini-toast system (`Toast` state + `useEffect` timer). Replace it with Sonner. Keep the existing optimistic preview and `useTransition` since those are specific to the file input UX.

```tsx
'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { uploadAvatarAction, removeAvatarAction } from '@/app/(app)/profile/actions'

interface AvatarUploadProps {
  initialAvatarUrl: string | null
  initials: string
}

export function AvatarUpload({ initialAvatarUrl, initials }: AvatarUploadProps) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialAvatarUrl)
  const [isUploading, startUpload] = useTransition()
  const [isRemoving, startRemove] = useTransition()

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const objectUrl = URL.createObjectURL(file)
    setPreviewUrl(objectUrl)

    const formData = new FormData()
    formData.set('avatar', file)

    startUpload(async () => {
      const result = await uploadAvatarAction(formData)
      URL.revokeObjectURL(objectUrl)
      if (!result.ok) {
        setPreviewUrl(null)
        toast.error(result.error)
      } else {
        toast.success('Avatar updated')
        router.refresh()
      }
      if (inputRef.current) inputRef.current.value = ''
    })
  }

  function handleRemove() {
    startRemove(async () => {
      const result = await removeAvatarAction()
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      setPreviewUrl(null)
      toast.success('Avatar removed')
      router.refresh()
    })
  }

  const isPending = isUploading || isRemoving

  return (
    <div className="mb-6">
      <div className="flex items-center gap-4">
        <div
          style={{
            width: 64, height: 64, borderRadius: '50%', overflow: 'hidden',
            background: '#1f2937', border: '2px solid #334155',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, position: 'relative',
            opacity: isPending ? 0.6 : 1, transition: 'opacity 0.15s',
          }}
        >
          {previewUrl ? (
            <img src={previewUrl} alt="Profile photo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span style={{ color: '#f59e0b', fontWeight: 700, fontSize: 20 }}>{initials}</span>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <label className="cursor-pointer rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-white hover:border-amber-400 hover:text-amber-400 transition-colors">
              {isUploading ? 'Uploading…' : 'Change photo'}
              <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={handleFileChange}
                disabled={isPending}
              />
            </label>
            {previewUrl && (
              <button
                type="button"
                onClick={handleRemove}
                disabled={isPending}
                className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-400 hover:border-red-500 hover:text-red-400 transition-colors disabled:opacity-50"
              >
                {isRemoving ? 'Removing…' : 'Remove'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Run tests**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Commit**

```bash
git add components/profile/BlindScoringToggle.tsx components/app/AvatarUpload.tsx
git commit -m "feat: migrate BlindScoringToggle and AvatarUpload to Sonner"
```

---

### Task 14: Migrate GoalForm and EvidenceLog

**Files:**
- Modify: `components/app/GoalForm.tsx`
- Modify: `components/app/EvidenceLog.tsx`

- [ ] **Update GoalForm**

`saveGoalAction` redirects on success, so no `onSuccess` toast. Add `loading={isPending}` to the submit button and replace the raw `<button>` with `<Button>`.

In `components/app/GoalForm.tsx`, replace the form submission and button:

```tsx
// Add at top:
import { Button } from '@/components/ui/button'
import { useMutation } from '@/hooks/use-mutation'

// Inside the component, replace the existing state/action setup:
const { mutate, isPending } = useMutation<void>()

// Replace the form's action prop with onSubmit:
<form
  onSubmit={e => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    fd.set('resource_ids', JSON.stringify(pinnedIds))
    if (checkinValue) fd.set('checkin_frequency_weeks', checkinValue)
    trackGoalCreated()
    mutate(() => saveGoalAction(fd))
  }}
>
```

Replace the submit button:
```tsx
<Button type="submit" loading={isPending}>
  Save goal
</Button>
```

Replace the Cancel `<a>` with:
```tsx
<Button variant="ghost" asChild>
  <a href="/growth">Cancel</a>
</Button>
```

- [ ] **Update EvidenceLog**

In `components/app/EvidenceLog.tsx`, replace the form's action and submit button:

```tsx
// Add at top:
import { Button } from '@/components/ui/button'
import { useMutation } from '@/hooks/use-mutation'

// Inside component, above the form:
const { mutate, isPending } = useMutation({ onSuccess: 'Evidence added' })

// Replace the form:
<form
  onSubmit={e => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    fd.set('plan_id', planId)
    mutate(async () => {
      const result = await addEvidenceAction(fd)
      if (result.ok) {
        trackGoalCheckin()
        setShowForm(false)
      }
      return result
    })
  }}
  className="mb-6 rounded-xl border border-slate-700 bg-slate-800 p-4"
>
```

Replace the submit button:
```tsx
<Button type="submit" loading={isPending} size="sm">
  Save
</Button>
<Button
  type="button"
  variant="ghost"
  size="sm"
  onClick={() => setShowForm(false)}
>
  Cancel
</Button>
```

Remove the `action={async (fd: FormData) => { ... }}` form action pattern entirely.

- [ ] **Run tests**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Commit**

```bash
git add components/app/GoalForm.tsx components/app/EvidenceLog.tsx
git commit -m "feat: migrate GoalForm and EvidenceLog to useMutation + Button"
```

---

### Task 15: Migrate GoalDetailClient and CreateRoundModal

**Files:**
- Modify: `components/app/GoalDetailClient.tsx`
- Modify: `components/reflections/CreateRoundModal.tsx`

- [ ] **Update GoalDetailClient**

Resource pin/unpin: no success toast (too frequent). Error toast only. Use `useMutation` with `onError` callback.

In `components/app/GoalDetailClient.tsx`, update the `toggleResource` function and add the hook:

```tsx
// Add at top:
import { useMutation } from '@/hooks/use-mutation'

// Inside component:
const { mutate: mutateResource } = useMutation<void>()

async function toggleResource(resourceId: string) {
  const next = new Set(pinnedIds)
  if (next.has(resourceId)) {
    next.delete(resourceId)
    setPinnedIds(next)
    mutateResource(() => removeGoalResourceAction(plan.id, resourceId))
  } else {
    next.add(resourceId)
    setPinnedIds(next)
    mutateResource(() => addGoalResourceAction(plan.id, resourceId))
  }
}
```

- [ ] **Update CreateRoundModal**

`createRoundAction` redirects on success, so no `onSuccess` toast.

In `components/reflections/CreateRoundModal.tsx`:

```tsx
// Add at top:
import { Button } from '@/components/ui/button'
import { useMutation } from '@/hooks/use-mutation'

// Inside component:
const { mutate, isPending } = useMutation()

// Replace the form:
<form
  onSubmit={e => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const title = (formData.get('title') as string) || ''
    trackRoundStarted(title)
    mutate(() => createRoundAction(formData))
  }}
  aria-label="Create round form"
  className="flex flex-col gap-4"
>
```

Replace the two buttons at the bottom:

```tsx
<div className="flex gap-3 pt-1">
  <Button
    type="button"
    variant="secondary"
    onClick={onClose}
    style={{ flex: 1 }}
  >
    Cancel
  </Button>
  <Button
    type="submit"
    loading={isPending}
    style={{ flex: 2 }}
  >
    Start reflection
  </Button>
</div>
```

- [ ] **Run tests**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Commit**

```bash
git add components/app/GoalDetailClient.tsx components/reflections/CreateRoundModal.tsx
git commit -m "feat: migrate GoalDetailClient and CreateRoundModal to useMutation + Button"
```

---

### Task 16: Migrate people components — connections and invites

**Files:**
- Modify: `app/(app)/people/YourConnections.tsx`
- Modify: `components/people/AddConnectionForm.tsx`
- Modify: `components/people/InviteManagerModal.tsx`

- [ ] **Update YourConnections — accept connection**

In `app/(app)/people/YourConnections.tsx`, the accept button is inside a `<form action={acceptConnectionAction.bind(null, c.id)}>`. Convert to a client-side button:

```tsx
// Add at top:
import { Button } from '@/components/ui/button'
import { useMutation } from '@/hooks/use-mutation'

// Create an AcceptButton sub-component inside the file:
function AcceptButton({ connectionId }: { connectionId: string }) {
  const { mutate, isPending } = useMutation({ onSuccess: 'Connection accepted' })
  return (
    <Button
      size="sm"
      onClick={() => mutate(() => acceptConnectionAction(connectionId))}
      loading={isPending}
    >
      Accept
    </Button>
  )
}
```

Replace the `<form action={...}><button ...>Accept</button></form>` with:
```tsx
<AcceptButton connectionId={c.id} />
```

Remove the `onClick={trackConnectionAccepted}` from the old button — move the analytics call into `AcceptButton`'s `onSuccess` callback:

```tsx
const { mutate, isPending } = useMutation({
  onSuccess: () => {
    trackConnectionAccepted()
    toast.success('Connection accepted')
  },
})
```

Import `toast` from `'sonner'` for the explicit success call, or use the string form and call `trackConnectionAccepted()` before `mutate`:

```tsx
// Simpler — call analytics before mutate, use string onSuccess:
function AcceptButton({ connectionId }: { connectionId: string }) {
  const { mutate, isPending } = useMutation({ onSuccess: 'Connection accepted' })
  return (
    <Button
      size="sm"
      onClick={() => {
        trackConnectionAccepted()
        mutate(() => acceptConnectionAction(connectionId))
      }}
      loading={isPending}
    >
      Accept
    </Button>
  )
}
```

- [ ] **Update AddConnectionForm**

Remove `useActionState`, remove `InviteState` import, switch to `useMutation`.

```tsx
'use client'

import { useState } from 'react'
import { inviteConnection } from '@/app/(app)/connections/actions'
import { useMutation } from '@/hooks/use-mutation'
import { Button } from '@/components/ui/button'
import { trackManagerInvited } from '@/lib/analytics'

export function AddConnectionForm() {
  const [open, setOpen] = useState(false)
  const { mutate, isPending } = useMutation({
    onSuccess: () => {
      trackManagerInvited()
      setOpen(false)
    },
    // inviteConnection returns specific error text from the server — show it via toast.error automatically
  })

  if (!open) {
    return (
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setOpen(true)}
      >
        + Add connection
      </Button>
    )
  }

  return (
    <form
      onSubmit={e => {
        e.preventDefault()
        const formData = new FormData(e.currentTarget)
        mutate(() => inviteConnection(formData))
      }}
      style={{
        background: '#111827', border: '1px solid #1f2937',
        borderRadius: 10, padding: 20,
      }}
    >
      <p className="mb-3 text-sm font-semibold text-white">Add a connection</p>
      <div className="flex flex-col gap-3">
        <input
          name="email"
          type="email"
          required
          placeholder="colleague@company.com"
          style={{ background: '#0d1117', border: '1px solid #1f2937', borderRadius: 6,
                   padding: '8px 12px', color: '#f1f5f9', fontSize: 14 }}
        />
        <div className="flex gap-4">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
            <input type="radio" name="role" value="direct_report" defaultChecked />
            They are my manager
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
            <input type="radio" name="role" value="manager" />
            They report to me
          </label>
        </div>
        <div className="flex gap-2">
          <Button type="submit" loading={isPending}>
            Send invite
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
        </div>
      </div>
    </form>
  )
}
```

- [ ] **Update InviteManagerModal**

Same pattern: remove `useActionState`, remove `InviteState` import, switch to `useMutation`.

```tsx
'use client'

import { useState } from 'react'
import { inviteConnection } from '@/app/(app)/connections/actions'
import { useMutation } from '@/hooks/use-mutation'
import { Button } from '@/components/ui/button'

interface Props {
  trigger?: React.ReactNode
}

export function InviteManagerModal({ trigger }: Props) {
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
            className="text-xs font-semibold text-amber-400 hover:text-amber-300"
          >
            Connect →
          </button>
        )}
      </div>

      {open && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 50,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 16,
          }}
          onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}
        >
          <div
            style={{
              background: '#111827', border: '1px solid #1f2937',
              borderRadius: 12, padding: 28, width: '100%', maxWidth: 460,
            }}
          >
            <h2 className="mb-1 text-lg font-bold text-white">Invite your manager</h2>
            <p className="mb-5 text-sm text-slate-400">
              We'll send them an email so they can connect and score your reflections.
            </p>
            <form
              onSubmit={e => {
                e.preventDefault()
                const formData = new FormData(e.currentTarget)
                mutate(() => inviteConnection(formData))
              }}
              className="flex flex-col gap-4"
            >
              <input type="hidden" name="role" value="direct_report" />
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400">
                  Their email address
                </label>
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="manager@company.com"
                  style={{ background: '#0d1117', border: '1px solid #1f2937', borderRadius: 6,
                           padding: '8px 12px', color: '#f1f5f9', fontSize: 14, width: '100%' }}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400">
                  Personal message <span className="text-slate-600">(optional)</span>
                </label>
                <textarea
                  name="message"
                  rows={3}
                  placeholder="Hi — I've been using Brilliant Managers to track my development. I'd love your perspective on my reflections."
                  style={{ background: '#0d1117', border: '1px solid #1f2937', borderRadius: 6,
                           padding: '8px 12px', color: '#f1f5f9', fontSize: 14, width: '100%',
                           resize: 'vertical' }}
                />
              </div>
              <div className="flex gap-3">
                <Button type="submit" loading={isPending} className="flex-1">
                  Send invite
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setOpen(false)}
                  className="shrink-0"
                >
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

- [ ] **Run tests**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Commit**

```bash
git add app/\(app\)/people/YourConnections.tsx components/people/AddConnectionForm.tsx components/people/InviteManagerModal.tsx
git commit -m "feat: migrate people connection components to useMutation + Button"
```

---

### Task 17: Migrate OrgSection and org components

**Files:**
- Modify: `app/(app)/people/OrgSection.tsx`
- Modify: `components/org/OrgHierarchy.tsx`
- Modify: `components/org/MemberStack.tsx`

- [ ] **Update OrgSection — create org form**

In `app/(app)/people/OrgSection.tsx`, replace the `<form action={createOrgAction}>` block:

```tsx
// Add at top:
import { Button } from '@/components/ui/button'
import { useMutation } from '@/hooks/use-mutation'

// Inside the component, add the hook:
const { mutate: createOrg, isPending: creatingOrg } = useMutation({ onSuccess: 'Organisation created' })

// Replace the form:
<form
  onSubmit={e => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    mutate(() => createOrgAction(fd))
  }}
  style={{ display: 'flex', gap: 8 }}
>
  <input
    name="name"
    placeholder="Organisation name"
    required
    style={{
      flex: 1, background: '#0d1117', border: '1px solid #1f2937', borderRadius: 6,
      padding: '8px 12px', color: '#f1f5f9', fontSize: 14,
    }}
  />
  <Button type="submit" loading={creatingOrg}>
    Create
  </Button>
</form>
```

- [ ] **Update OrgHierarchy — createNodeAction error handling**

`OrgHierarchy` already uses `useTransition` for optimistic updates. Add `toast.error` on failure without adding a second `useTransition`.

In `components/org/OrgHierarchy.tsx`:

```tsx
// Add at top:
import { toast } from 'sonner'

// Update makeAddNodeFormAction:
function makeAddNodeFormAction(parentId: string | null) {
  return async (formData: FormData) => {
    const name = (formData.get('name') as string | null)?.trim()
    if (!name) return
    if (parentId !== null) formData.set('parentId', parentId)
    startTransition(async () => {
      addOptimisticNode({
        id: `provisional-${Date.now()}`,
        name,
        parent_id: parentId,
        org_id: orgId,
        node_type: null,
        created_at: new Date().toISOString(),
        members: [],
        pendingInvites: [],
        _provisional: true,
      })
      const result = await createNodeAction(formData)
      if (!result.ok) toast.error(result.error)
    })
  }
}
```

- [ ] **Update MemberStack — member actions**

`MemberStack` uses `removeMemberFromNodeAction` and `cancelPendingOrgNodeInvitationAction` as plain form actions. Convert to `useMutation`.

In `components/org/MemberStack.tsx`, replace the `<form action={...}>` patterns:

```tsx
// Add at top:
import { useMutation } from '@/hooks/use-mutation'
import { Button } from '@/components/ui/button'

// Create inline button components for remove/cancel to contain their own hook instances:
function RemoveMemberButton({ nodeId, orgId, userId }: { nodeId: string; orgId: string; userId: string }) {
  const { mutate, isPending } = useMutation({ onSuccess: 'Member removed' })
  return (
    <Button
      variant="danger"
      size="sm"
      loading={isPending}
      onClick={() => {
        const fd = new FormData()
        fd.set('nodeId', nodeId)
        fd.set('orgId', orgId)
        fd.set('userId', userId)
        mutate(() => removeMemberFromNodeAction(fd))
      }}
    >
      Remove
    </Button>
  )
}

function CancelInviteButton({ invitationId, orgId }: { invitationId: string; orgId: string }) {
  const { mutate, isPending } = useMutation({ onSuccess: 'Invite cancelled' })
  return (
    <Button
      variant="secondary"
      size="sm"
      loading={isPending}
      onClick={() => {
        const fd = new FormData()
        fd.set('invitationId', invitationId)
        fd.set('orgId', orgId)
        mutate(() => cancelPendingOrgNodeInvitationAction(fd))
      }}
    >
      Cancel
    </Button>
  )
}
```

Replace the existing `<form action={removeMemberFromNodeAction} style={{ display: 'inline' }}>` and `<form action={cancelPendingOrgNodeInvitationAction}>` blocks with `<RemoveMemberButton>` and `<CancelInviteButton>`.

For `addMemberToNodeAction`, it already uses a client-side async call (`action={async (fd) => { const result = await addMemberToNodeAction(fd); ... }}`). Update to use `useMutation`:

```tsx
function AddMemberForm({ nodeId, orgId }: { nodeId: string; orgId: string }) {
  const { mutate, isPending } = useMutation({ onSuccess: 'Member added' })
  return (
    <form
      onSubmit={e => {
        e.preventDefault()
        const fd = new FormData(e.currentTarget)
        mutate(() => addMemberToNodeAction(fd))
      }}
    >
      {/* existing email input */}
      <Button type="submit" loading={isPending} size="sm">Add</Button>
    </form>
  )
}
```

Adapt to match the existing form structure in `MemberStack.tsx`.

- [ ] **Run tests**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Commit**

```bash
git add app/\(app\)/people/OrgSection.tsx components/org/OrgHierarchy.tsx components/org/MemberStack.tsx
git commit -m "feat: migrate org components to useMutation + Button"
```

---

### Task 18: Migrate SkillList and ManagerScoringView

**Files:**
- Modify: `components/app/scorecard/SkillList.tsx`
- Modify: `components/app/ManagerScoringView.tsx`

These are auto-save components (no Button involved). The save calls already use `useTransition`. Add `toast.error` on failure; use the `ActionResult` return type.

- [ ] **Update SkillList**

In `components/app/scorecard/SkillList.tsx`, update `handleRate`:

```tsx
// Add at top:
import { toast } from 'sonner'

const handleRate = (skill: Skill, level: Level) => {
  if (scores[skill.key] === level) return
  const previousLevel = scores[skill.key]
  onScore(skill.key, level)
  const currentIndex = skills.findIndex(s => s.key === skill.key)
  const nextSkill = skills[currentIndex + 1]
  onSkillActivate(nextSkill ? nextSkill.key : skill.key)
  startTransition(async () => {
    const result = await saveScore(roundId, skill.pillar, skill.key, level)
    if (!result.ok) {
      toast.error(result.error)
      onScore(skill.key, previousLevel)
      return
    }
    trackPillarScored(skill.pillar, level)
    if (result.data?.roundCompleted) {
      trackRoundCompleted(roundId)
      trackScorecardCompleted()
    }
  })
}
```

- [ ] **Update ManagerScoringView**

In `components/app/ManagerScoringView.tsx`, update `handleSelect`:

```tsx
// Add at top:
import { toast } from 'sonner'

function handleSelect(skillKey: string, level: Level) {
  setScores(prev => ({ ...prev, [skillKey]: level }))
  startTransition(async () => {
    const result = await saveManagerScore(roundId, pillar, skillKey, level)
    if (!result.ok) {
      toast.error(result.error)
      setScores(prev => ({ ...prev, [skillKey]: initialScores[skillKey] }))
    }
  })
}
```

- [ ] **Run tests**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Commit**

```bash
git add components/app/scorecard/SkillList.tsx components/app/ManagerScoringView.tsx
git commit -m "feat: add error toasts to SkillList and ManagerScoringView"
```

---

### Task 19: Migrate admin pages

**Files:**
- Create: `app/(app)/admin/users/AdminUsersTable.tsx`
- Modify: `app/(app)/admin/users/page.tsx`
- Create: `app/(app)/admin/organisations/AdminOrgsTable.tsx`
- Modify: `app/(app)/admin/organisations/page.tsx`

Admin pages are server components. Extract the interactive table rows into client components.

- [ ] **Create `app/(app)/admin/users/AdminUsersTable.tsx`**

```tsx
'use client'

import { Button } from '@/components/ui/button'
import { useMutation } from '@/hooks/use-mutation'
import { grantSuperAdminAction, revokeSuperAdminAction } from './actions'

interface User {
  id: string
  display_name: string | null
  email: string | null
  is_super_admin: boolean
  created_at: string
}

interface Props {
  users: User[]
  currentUserId: string
}

function RoleButton({ userId, isSuperAdmin }: { userId: string; isSuperAdmin: boolean }) {
  const action = isSuperAdmin ? revokeSuperAdminAction : grantSuperAdminAction
  const label = isSuperAdmin ? 'Revoke admin' : 'Grant admin'
  const successMsg = isSuperAdmin ? 'Admin role revoked' : 'Admin role granted'
  const { mutate, isPending } = useMutation({ onSuccess: successMsg })

  return (
    <Button
      variant="ghost"
      size="sm"
      loading={isPending}
      onClick={() => {
        const fd = new FormData()
        fd.set('userId', userId)
        mutate(() => action(fd))
      }}
    >
      {label}
    </Button>
  )
}

export function AdminUsersTable({ users, currentUserId }: Props) {
  return (
    <div className="overflow-hidden rounded-xl" style={{ border: '1px solid #1f2937' }}>
      <table className="w-full text-sm">
        <thead style={{ background: '#111827' }}>
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">Name</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">Email</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">Role</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">Joined</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody style={{ background: '#0d1117' }}>
          {users.map(u => (
            <tr key={u.id} style={{ borderTop: '1px solid #1f2937' }}>
              <td className="px-4 py-3 text-white">{u.display_name ?? '—'}</td>
              <td className="px-4 py-3 text-slate-400">{u.email ?? '—'}</td>
              <td className="px-4 py-3">
                {u.is_super_admin ? (
                  <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-semibold text-amber-400">
                    SuperAdmin
                  </span>
                ) : (
                  <span className="text-slate-500">User</span>
                )}
              </td>
              <td className="px-4 py-3 text-slate-500">
                {new Date(u.created_at).toLocaleDateString()}
              </td>
              <td className="px-4 py-3 text-right">
                {u.id !== currentUserId && (
                  <RoleButton userId={u.id} isSuperAdmin={u.is_super_admin} />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Update `app/(app)/admin/users/page.tsx`**

Replace the table markup with `<AdminUsersTable>`:

```tsx
import { createClient } from '@/lib/supabase/server'
import { listAllUsersWithRoles } from '@/lib/db/user-roles'
import { AdminUsersTable } from './AdminUsersTable'

export default async function AdminUsersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const users = await listAllUsersWithRoles()

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-6 text-2xl font-bold text-white">Users</h1>
      <AdminUsersTable users={users} currentUserId={user!.id} />
    </div>
  )
}
```

- [ ] **Read `app/(app)/admin/organisations/page.tsx`** before creating `AdminOrgsTable`

Read the file to understand its current structure, then extract the table/form interactions into `AdminOrgsTable.tsx` following the same pattern as `AdminUsersTable`. The delete form should become a `DeleteOrgButton` that calls `deleteOrgAction` via `useMutation({ onSuccess: 'Organisation deleted' })`.

- [ ] **Run tests**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Commit**

```bash
git add app/\(app\)/admin/
git commit -m "feat: migrate admin pages to client table components with useMutation"
```

---

### Task 20: Final verification

**Files:** none

- [ ] **Run full test suite**

```bash
npm test
```

Expected: all tests pass, including the new `use-mutation` and `action-result` tests.

- [ ] **Run lint**

```bash
npm run lint
```

Fix any reported errors before continuing.

- [ ] **Run build**

```bash
npm run build
```

Expected: clean build with no TypeScript errors.

- [ ] **Manual smoke test**

Start the dev server (`npm run dev`) and verify:

1. **Profile page** — change display name, click "Save changes" → dots appear → "Profile saved" toast bottom-right.
2. **Avatar upload** — upload a photo → "Avatar updated" toast.
3. **Blind scoring toggle** — flip the switch → "Preference saved" toast.
4. **Create reflection round** — fill in form, click "Start reflection" → dots appear → redirect to scorecard (no toast).
5. **Create goal** — fill in form, click "Save goal" → dots appear → redirect to goal page (no toast).
6. **Add evidence** — fill in evidence form → "Evidence added" toast.
7. **Accept connection** — if a pending connection exists, click Accept → "Connection accepted" toast.
8. **Add connection** — send an invite → "Invite sent" toast (or server's specific error if invalid email).
9. **Invite manager** — open modal, send invite → modal closes, "Invitation sent" toast.
10. **Create org** — enter org name, click Create → "Organisation created" toast.
11. **Error case** — temporarily edit `updateProfileAction` to `return err('Test error')`, save profile → "Test error" toast. Revert after confirming.

- [ ] **Final commit (if any lint/build fixes were needed)**

```bash
git add -A
git commit -m "fix: resolve lint and build errors after mutation migration"
```

---

## Self-Review Notes

**Spec coverage check:**

- ✅ Sonner installed, Toaster in authenticated shell (Task 2)
- ✅ `ActionResult<T>` type (Task 3)
- ✅ Button CSS tokens in `globals.css` (Task 4)
- ✅ Button `loading` prop + new variants (Task 5)
- ✅ `useMutation` hook + tests (Task 6)
- ✅ All server action files migrated (Tasks 7–11)
- ✅ ProfileForm split (Task 12)
- ✅ BlindScoringToggle, AvatarUpload (Task 13)
- ✅ GoalForm, EvidenceLog (Task 14)
- ✅ GoalDetailClient, CreateRoundModal (Task 15)
- ✅ YourConnections, AddConnectionForm, InviteManagerModal (Task 16)
- ✅ OrgSection, OrgHierarchy, MemberStack (Task 17)
- ✅ SkillList, ManagerScoringView (Task 18)
- ✅ Admin pages (Task 19)
- ✅ Toast catalogue: profile saved, avatar updated/removed, preference saved, evidence added, connection accepted, invite sent, org created, member added/removed, admin role granted/revoked, all errors
- ✅ No toast for scorecard auto-save, resource pin/unpin, redirect-based flows
