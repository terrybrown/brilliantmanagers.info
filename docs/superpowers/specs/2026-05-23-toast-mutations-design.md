# Toast Notifications + Consistent Mutation UX

**Date:** 2026-05-23
**Status:** Approved

## Goals

1. Every mutation on the site has a consistent loading state (dots animation, button hidden while pending).
2. Every mutation surfaces errors as a Sonner toast — users never silently fail.
3. In-place mutations (no redirect) also show a success toast.
4. All button instances use a shared `Button` component with semantic variants driven by CSS tokens — one token change updates every button.

## Decisions

- **Toast library:** Sonner via shadcn (`npx shadcn add sonner`). Position: `bottom-right`. Theme: dark.
- **Error propagation:** `ActionResult<T>` return type on all server actions (Approach A). Server actions return `{ ok: false; error: string }` on failure instead of throwing. Redirect-based actions still call `redirect()` on success — the redirect takes over before the client sees a return value.
- **Loading state:** Dots animation (three bouncing dots replace the button label). Button is visually hidden (`opacity-0 pointer-events-none`) while the dots are shown, preserving layout width.
- **Button colour tokens:** Defined as CSS custom properties in `app/globals.css`. Tailwind classes reference the tokens. Changing the primary colour requires editing one variable.
- **`inviteConnection` migration:** Currently uses `useActionState` (old approach B pattern). Migrated to return `ActionResult` with `prevState` removed; `AddConnectionForm` switches to `useMutation`.

## Architecture

### `lib/action-result.ts` (new)

```ts
export type ActionResult<T = void> =
  | { ok: true; data?: T }
  | { ok: false; error: string }

export const ok = <T>(data?: T): ActionResult<T> => ({ ok: true, data })
export const err = (error: string): ActionResult<never> => ({ ok: false, error })
```

### `app/globals.css` — button colour tokens

```css
:root {
  --btn-primary-bg: theme(colors.amber.500);
  --btn-primary-bg-hover: theme(colors.amber.400);
  --btn-primary-text: #1a2a3a;

  --btn-secondary-border: theme(colors.slate.700);
  --btn-secondary-text: theme(colors.slate.400);

  --btn-danger-bg: rgba(239,68,68,0.15);
  --btn-danger-border: rgba(239,68,68,0.3);
  --btn-danger-text: theme(colors.red.400);
}
```

### `components/ui/button.tsx` — enhanced

Gains a `loading` boolean prop. When `loading=true`, the button label is `opacity-0` and an absolutely-positioned dots animation is centred over it (preserving the button's width so layout doesn't shift). Disabled while loading.

Variants (mapped to CSS tokens):
- `primary` — amber background, dark text. **Default.**
- `secondary` — transparent background, slate border.
- `ghost` — transparent, no border, slate text.
- `danger` — red-tinted background, red border, red text.

Size variants: `default` (`px-5 py-2.5`) and `sm` (`px-3 py-1.5`).

### Dots animation CSS (in `globals.css`)

```css
@keyframes dotBounce {
  0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
  40%           { transform: translateY(-5px); opacity: 1; }
}
.dot-1 { animation: dotBounce 1.1s infinite ease-in-out; }
.dot-2 { animation: dotBounce 1.1s 0.16s infinite ease-in-out; }
.dot-3 { animation: dotBounce 1.1s 0.32s infinite ease-in-out; }
```

### `hooks/use-mutation.ts` (new)

```ts
function useMutation<T>(
  action: () => Promise<ActionResult<T>>,
  options?: {
    onSuccess?: string | ((data?: T) => void)
    onError?: (error: string) => void
  }
): { mutate: () => void; isPending: boolean }
```

Internally uses `useTransition`. On `ok: false`, calls `toast.error(result.error)` (and `options.onError` if provided). On `ok: true`, calls `toast.success(options.onSuccess)` if `onSuccess` is a string, or calls the callback if it's a function.

Usage:
```ts
const { mutate, isPending } = useMutation(
  () => updateBlindScoringAction(enabled),
  { onSuccess: 'Preference saved' }
)
```

The `mutate` function is passed as `onClick` or called in `onSubmit`. `isPending` is passed to `<Button loading={isPending}>`.

### `<Toaster>` placement

Added to `app/(app)/layout.tsx` (the authenticated shell). Not added to public pages — toasts are an authenticated-app concern.

## Server Action Migration

All server actions return `ActionResult` instead of `void`. The `ok` / `err` helpers keep call sites concise.

### Pattern — redirect-based (profile, goal, round)

```ts
export async function updateProfileAction(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return err('Not authenticated')

  const { error } = await supabase.from('profiles').update({ ... }).eq('id', user.id)
  if (error) return err('Failed to save profile. Please try again.')

  await logAudit(...)
  revalidatePath('/profile')
  // No redirect needed — profile page revalidates in place
  return ok()
}
```

> Note: `updateProfileAction` currently uses `revalidatePath` and does NOT redirect. The form will switch to `useMutation` with `onSuccess: 'Profile saved'`.

`saveGoalAction` and `createRoundAction` do call `redirect()`. Pattern:
```ts
export async function saveGoalAction(formData: FormData): Promise<ActionResult> {
  // ... validation and DB work ...
  if (dbError) return err('Failed to save goal. Please try again.')
  redirect(`/growth/goal/${plan.id}`) // Next.js intercepts; client never sees the return
}
```

### Pattern — in-place (toggle, accept, evidence)

```ts
export async function updateBlindScoringAction(value: boolean): Promise<ActionResult> {
  // ... auth check ...
  const { error } = await supabase.from('profiles').update({ manager_scoring_blind: value })
  if (error) return err('Failed to update preference')
  await logAudit(...)
  revalidatePath('/profile')
  return ok()
}

export async function acceptConnectionAction(connectionId: string): Promise<ActionResult> {
  // ... existing logic ...
  revalidatePath('/people')
  return ok()
}
```

### `inviteConnection` — signature change

Remove `prevState` parameter (no longer using `useActionState`):
```ts
export async function inviteConnection(formData: FormData): Promise<ActionResult>
```

### Files to update

| File | Change |
|---|---|
| `app/(app)/profile/actions.ts` | `updateProfileAction`, `updateBlindScoringAction`, `uploadAvatarAction`, `removeAvatarAction` → return `ActionResult` |
| `app/(app)/growth/actions.ts` | `saveGoalAction`, `markGoalCompleteAction`, `addEvidenceAction`, `addGoalResourceAction`, `removeGoalResourceAction` → return `ActionResult` |
| `app/(app)/reflections/actions.ts` | `createRoundAction` → return `ActionResult` |
| `app/(app)/connections/actions.ts` | `inviteConnection` (remove prevState), `acceptConnectionAction` → return `ActionResult`. Remove `InviteState` type export. |
| `app/(app)/organisation/actions.ts` | All mutations → return `ActionResult` |
| `app/(app)/notifications/actions.ts` | All mutations → return `ActionResult` |
| `app/(app)/admin/organisations/actions.ts` | All mutations → return `ActionResult` |
| `app/(app)/admin/users/actions.ts` | All mutations → return `ActionResult` |
| `app/(app)/manager/[userId]/actions.ts` | All mutations → return `ActionResult` |
| `app/(app)/scorecard/actions.ts` | `saveScore` → return `ActionResult<{ roundCompleted: boolean }>` |

## Client Component Migration

Every component that calls a server action switches from its current ad-hoc pattern to `useMutation` + `<Button loading={isPending}>`.

### Components to update

| Component | Current pattern | New pattern |
|---|---|---|
| `app/(app)/profile/page.tsx` | Server-rendered form, `action={updateProfileAction}` | Wrap form fields in a `'use client'` `ProfileForm` component; `useMutation` with `onSuccess: 'Profile saved'` |
| `components/app/GoalForm.tsx` | `action={async fd => { ... await saveGoalAction(fd) }}` | `useMutation` (no onSuccess — redirect handles it) |
| `components/reflections/CreateRoundModal.tsx` | `action={createRoundAction}` | `useMutation` (no onSuccess — redirect handles it) |
| `components/profile/BlindScoringToggle.tsx` | `useTransition` fire-and-forget | `useMutation` with `onSuccess: 'Preference saved'` |
| `components/app/GoalDetailClient.tsx` | Bare `await` calls for resource pin/unpin | `useMutation` with `onError` only (no success toast — too frequent) |
| `components/app/EvidenceLog.tsx` | Form submission | `useMutation` with `onSuccess: 'Evidence added'` |
| `components/people/AddConnectionForm.tsx` | `useActionState` | `useMutation` with `onSuccess: 'Invite sent'`; remove `useActionState`, remove `InviteState` import |
| `components/people/InviteManagerModal.tsx` | `useActionState` with `InviteState` | `useMutation` with `onSuccess: 'Invitation sent'`; remove `useActionState`, remove `InviteState` import |
| `app/(app)/people/YourConnections.tsx` | `<form action={acceptConnectionAction.bind(null, c.id)}>` | `useMutation` with `onSuccess: 'Connection accepted'` |
| `app/(app)/people/OrgSection.tsx` | `action={createOrgAction}` | `useMutation` with `onSuccess: 'Organisation created'` |
| `components/app/AvatarUpload.tsx` | Already client-side, checks `{ error }` | Add `toast.error()` on error, `toast.success('Avatar updated')` on success |
| `app/(app)/scorecard/*` | `saveScore` called directly | `useMutation` with `onError` only |
| Admin pages | Various | `useMutation` per action, appropriate success messages |

### Profile page split

`app/(app)/profile/page.tsx` is currently a server component. The form fields must move to a new `components/profile/ProfileForm.tsx` client component (keeps the server component for data fetching).

## Toast Message Catalogue

| Action | Success | Error |
|---|---|---|
| Save profile | "Profile saved" | "Failed to save profile" |
| Upload avatar | "Avatar updated" | "Failed to upload avatar" |
| Remove avatar | "Avatar removed" | "Failed to remove avatar" |
| Blind scoring toggle | "Preference saved" | "Failed to update preference" |
| Save goal | *(redirect)* | "Failed to save goal" |
| Mark goal complete | *(overlay handles this)* | "Failed to mark goal complete" |
| Add evidence | "Evidence added" | "Failed to add evidence" |
| Pin/unpin resource | *(no toast — too frequent)* | "Failed to update resources" |
| Create reflection round | *(redirect)* | "Failed to create round" |
| Accept connection | "Connection accepted" | "Failed to accept connection" |
| Send connection invite | "Invite sent" | *(server returns specific error — show it)* |
| Create organisation | "Organisation created" | "Failed to create organisation" |
| Other org mutations | varies | "Action failed. Please try again." |
| Save scorecard score | *(no toast — auto-save)* | "Failed to save score" |
| Admin mutations | varies | "Action failed" |

## Testing

- Existing test suite must pass before and after changes.
- New tests: `hooks/use-mutation.test.ts` — unit test the hook's optimistic state, success toast call, and error toast call using a mock server action.
- Integration: manually verify each mutation surface shows the correct loading state, success toast (where applicable), and error toast (by temporarily returning `err(...)` in dev).

## Out of Scope

- Toast for scorecard score auto-saves (too frequent, would be noisy).
- Toast for resource pin/unpin (optimistic UI is already the feedback).
- Public page mutations (login, the-tool join form) — these are outside the authenticated shell and don't need the Toaster.
- Future notification preference settings (reflection cadence, email opt-in) — these don't exist yet as UI.
