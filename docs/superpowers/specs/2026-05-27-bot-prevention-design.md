# Bot Prevention & Cleanup Design

**Date:** 2026-05-27  
**Status:** Approved

## Problem

Bots are submitting the signup and login forms, triggering Supabase `signInWithOtp` calls and burning Mailgun/Supabase email quota. The accounts land in Supabase with "Waiting for verification" status and never complete signup, but the emails are already sent.

Two entry points are affected:
- `app/the-tool/JoinNowForm.tsx` — marketing page signup
- `app/login/page.tsx` — sign in page

## Solution

**Cloudflare Turnstile + Supabase native CAPTCHA support.** Supabase verifies the Turnstile token server-side before processing the OTP request — no Next.js server action required. Real users see no friction (Turnstile is invisible in the vast majority of cases). Bots cannot obtain a valid token, so the OTP email is never sent.

A one-time cleanup script removes existing unverified accounts.

---

## Part 1: Dashboard Setup (Manual — done once by the developer)

### Step 1: Create a Turnstile site in Cloudflare

1. Log in to [dash.cloudflare.com](https://dash.cloudflare.com)
2. In the left sidebar, click **Turnstile** (under the main navigation — you may need to scroll down past your domains)
3. Click **Add site**
4. Fill in the form:
   - **Site name:** `brilliantmanagers.info` (or any label you like)
   - **Domain:** `brilliantmanagers.info`
   - **Widget type:** Choose **Managed** (Cloudflare decides when to show a challenge — invisible to most users)
5. Click **Create**
6. You will be shown a **Site Key** and a **Secret Key**. Copy both — you need them in the next steps. The secret key is only shown once in full; you can always retrieve it later from the Turnstile dashboard.

### Step 2: Enable CAPTCHA in Supabase

1. Go to your Supabase project → **Authentication** → **Sign In / Up** (in the left nav under Auth)
2. Scroll down to the **CAPTCHA protection** section
3. Toggle it **on**
4. Select **Cloudflare Turnstile** as the provider
5. Paste the **Secret Key** from Step 1
6. Click **Save**

After this, any `signInWithOtp` call that does not include a valid `captchaToken` will be rejected by Supabase with a 400 error. This is the gate that stops bots.

### Step 3: Add environment variables

**In Netlify:**
1. Go to your site → **Site configuration** → **Environment variables**
2. Add: `NEXT_PUBLIC_TURNSTILE_SITE_KEY` = the Site Key from Step 1
3. Trigger a redeploy after saving

**Locally:**
Add to `.env.local`:
```
NEXT_PUBLIC_TURNSTILE_SITE_KEY=<your site key>
```

---

## Part 2: Code Changes

### Install the Turnstile widget package

```bash
npm install @marsidev/react-turnstile
```

`@marsidev/react-turnstile` is a lightweight (~2kB) React wrapper around the Cloudflare Turnstile JS API. It handles script loading and exposes an `onSuccess` callback that returns the token.

### Wire up `JoinNowForm.tsx`

- Import `Turnstile` from `@marsidev/react-turnstile`
- Add a `captchaToken` state variable (string | null, starts null)
- Render `<Turnstile siteKey={...} onSuccess={token => setCaptchaToken(token)} />` inside the form
- Disable the submit button while `captchaToken` is null
- Pass `options: { captchaToken }` to the existing `signInWithOtp` call
- Reset `captchaToken` to null on error (Turnstile tokens are single-use)

### Wire up `app/login/page.tsx`

Same pattern as `JoinNowForm.tsx`.

### Environment variable access

Both components read `process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY`. This is safe to expose in the client bundle — the site key is public by design (it identifies your site to Cloudflare's widget JS, but has no privileged access). Only the secret key must stay server-side (it lives in Supabase's dashboard, never in the codebase).

---

## Part 3: One-Time Cleanup Script

`scripts/cleanup-unverified-users.ts`

Uses the Supabase admin client (service role key) to:
1. List all auth users
2. Filter to those with `email_confirmed_at === null` AND `created_at` older than 7 days
3. Delete each one via `supabase.auth.admin.deleteUser(id)`
4. Print a summary: how many found, how many deleted, any errors

Run with:
```bash
SUPABASE_SERVICE_ROLE_KEY=<key> npx tsx scripts/cleanup-unverified-users.ts
```

The 7-day grace period ensures no real user who is mid-signup is accidentally deleted (Supabase magic links expire in 24 hours by default, so 7 days is generous).

**No ongoing automation.** Once Turnstile is live, new bot registrations are blocked. The script is a one-shot tidy-up of the existing backlog. Re-run manually if ever needed.

---

## Scope

| What | Where | Type |
|---|---|---|
| Enable Turnstile CAPTCHA | Supabase Auth dashboard | Manual |
| Create Turnstile site | Cloudflare Turnstile dashboard | Manual |
| Add `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Netlify env vars + `.env.local` | Manual |
| Install `@marsidev/react-turnstile` | `package.json` | Code |
| Widget + token in `JoinNowForm.tsx` | `app/the-tool/JoinNowForm.tsx` | Code |
| Widget + token in `LoginPage` | `app/login/page.tsx` | Code |
| Cleanup script | `scripts/cleanup-unverified-users.ts` | Code |

## Out of Scope

- Cloudflare proxy in front of Netlify (not needed for this solution)
- Automated recurring cleanup (Turnstile prevents new bots; one-time script handles backlog)
- Invite-only or approval-gated registration
