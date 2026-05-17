# Safe Links — Auth Confirm Page Design

**Date:** 2026-05-17
**Status:** Approved, ready for implementation

## Problem

Microsoft Safe Links (Exchange ATP) pre-fetches every URL in an email to scan for malware. Supabase magic links are single-use — when Safe Links GETs the callback URL, Supabase exchanges the code and the token is consumed. By the time the real user clicks the link, it returns `otp_expired`.

## Solution

Insert an intermediate confirmation page between the magic link and the session exchange. Safe Links follows the link and sees a page with a button — it does not click buttons or submit forms. The token is only consumed when the real user clicks the button (via a form POST / server action).

## Architecture

**No database changes. No Supabase auth config changes beyond adding a redirect URL.**

### Files changed

| File | Change |
|---|---|
| `app/login/page.tsx` | Change `emailRedirectTo` from `/auth/callback` to `/auth/confirm` |
| `app/auth/callback/route.ts` | Unchanged — kept for other Supabase flows (email confirmation, password reset) |

### Files created

| File | Purpose |
|---|---|
| `app/auth/confirm/page.tsx` | Server component — shows "Complete your sign-in" button; does NOT exchange the code |
| `app/auth/confirm/actions.ts` | Server action — exchanges the code, upserts profile, redirects to `/dashboard` |

---

## Flow

### Happy path (Safe Links present)

1. User submits email → `signInWithOtp({ emailRedirectTo: '/auth/confirm' })`
2. Supabase sends email with link: `https://brilliantmanagers.info/auth/confirm?code=xxx`
3. Safe Links GETs `/auth/confirm?code=xxx` → page renders, shows button → token untouched
4. User opens email, clicks link → `/auth/confirm?code=xxx` → sees "Complete sign-in" button
5. User clicks button → form POST → `confirmLogin(formData)` server action
6. Server action calls `exchangeCodeForSession(code)` → sets session cookies → redirects to `/dashboard`

### Error path (expired / invalid code)

- Supabase passes `?error=...&error_description=...` in the redirect URL
- Confirm page detects `error` param, shows "Link expired" message with a "Back to sign in" link
- No exchange attempted

### Missing code (direct navigation to `/auth/confirm`)

- Redirect immediately to `/login`

---

## Component Design

### `app/auth/confirm/page.tsx`

Server component. Reads `searchParams.code`, `searchParams.error`, `searchParams.error_description`.

Three render states:
1. **Error state** (`error` param present): heading "Link expired", description from `error_description`, link back to `/login`
2. **No code** (`code` absent, no error): `redirect('/login')`
3. **Valid code**: heading "Complete your sign-in", subtext, form with hidden `code` input and submit button calling `confirmLogin` server action

Styling matches the existing login page (`flex min-h-screen items-center justify-center`, amber button, slate text).

### `app/auth/confirm/actions.ts`

```ts
'use server'
export async function confirmLogin(formData: FormData) {
  const code = formData.get('code') as string
  if (!code) redirect('/login')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.exchangeCodeForSession(code)

  if (user) {
    await supabase.from('profiles').upsert(
      { id: user.id, email: user.email, display_name: user.email?.split('@')[0] ?? '' },
      { onConflict: 'id' }
    )
  }

  redirect('/dashboard')
}
```

---

## Supabase Dashboard Configuration

After deployment, add the new redirect URL:

**Authentication → URL Configuration → Redirect URLs**

Add: `https://brilliantmanagers.info/auth/confirm`

The development URL also needs adding if you test locally:

Add: `http://localhost:3000/auth/confirm`

That is the only dashboard change required.

---

## What is not changing

- The `/auth/callback` route — kept intact for email confirmation, password reset, and any other Supabase-initiated redirects
- The Supabase auth flow, token generation, session management
- The profiles table or any RLS policies
- The login page UI — only the `emailRedirectTo` value changes
