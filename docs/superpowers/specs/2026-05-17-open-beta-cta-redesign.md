# Open Beta & CTA Redesign

**Date:** 2026-05-17  
**Status:** Approved

## Overview

Three user-facing changes to open the beta to all comers, improve the tool page call-to-action, and wire up a consistent sign-in/sign-up flow across the public site.

Notifications on new sign-up are explicitly deferred — will be handled in a future admin interface.

---

## Changes

### 1. Open the beta (`app/(app)/layout.tsx`, `.env.local`)

The `APP_BETA_EMAILS` environment variable currently gates access to the app — anyone not on the comma-separated allow-list is redirected to `/the-tool`. Remove this gate entirely.

- Delete the `betaEmails` block (lines 20–24 of `app/(app)/layout.tsx`)
- Change `showBeta={!!process.env.APP_BETA_EMAILS}` to `showBeta={true}` — the app is still in beta and the topbar badge should remain
- Remove `APP_BETA_EMAILS` from `.env.local`

Any authenticated user now reaches the app. Supabase RLS continues to enforce data access per user.

---

### 2. Tool page CTA (`app/the-tool/page.tsx` + `components/tool/BetaSignupForm.tsx`)

Replace the existing "Coming in v2" bottom box with a visually prominent beta sign-up section.

**New section appearance:**
- Dark card (`rgba(254,252,247,0.04)` background, amber top border `3px solid #f59e0b`, amber-tinted full border `rgba(245,158,11,0.30)`)
- `id="beta-signup"` on the section wrapper for deep-linking from the login page
- "Beta — Free to join" pill badge (amber)
- Headline: **"Stop flying blind on your own development."**
- Body: *"Most managers wait until their performance review to find out where they stand. Brilliant Managers changes that — score yourself across six pillars, get clear insights into where you're strong and where to improve, and leave every session with practical steps you can act on straight away."*
- Inline email input + **"Get early access →"** amber button (row layout)
- Subtext: *"No password. Click the link in your email and you're in."*

**`BetaSignupForm` client component** (`components/tool/BetaSignupForm.tsx`):
- Encapsulates all interactive state (email, sent, error)
- On submit: calls `supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin + '/auth/callback' } })`
- On success: replaces the form inline with a "Check your email" confirmation message showing the submitted address
- On error: shows the error message below the form
- Uses the Supabase browser client (`@/lib/supabase/client`)

The rest of the tool page (hero section, scorecard preview, top buttons) is unchanged.

---

### 3. Public nav "Sign in" button (`components/layout/nav.tsx`)

Add a "Sign in" button to the right side of the public nav bar, to the left of the existing GitHub button.

- Links to `/login`
- Amber outline style: `border: 1px solid rgba(245,158,11,0.5)`, `color: #f59e0b`, matching the site's accent
- Hidden on mobile (consistent with the existing GitHub button's `hidden md:block` behaviour)
- Shown on all public routes (the nav is not rendered inside the `(app)` layout)

---

### 4. Login page link (`app/login/page.tsx`)

Add a "New here? Sign up for the beta →" link below the magic link form on the login page.

- Links to `/the-tool#beta-signup`
- Subtle styling: small text, muted colour — secondary to the main form action
- Shown only in the initial form state — hidden once the user has submitted (the link is irrelevant at that point)

---

## User flows

**New user (no account):**
1. Sees "Sign in" in nav → clicks → `/login`
2. Reads "New here? Sign up for the beta →" → clicks → `/the-tool#beta-signup`
3. Enters email in inline form → clicks "Get early access →"
4. Supabase sends magic link; form shows "Check your email" inline
5. Clicks link in email → `/auth/callback` → redirected into the app

**Returning user:**
1. Sees "Sign in" in nav → `/login`
2. Enters email → magic link → into the app

**User who lands directly on tool page:**
1. Scrolls to CTA → enters email directly → magic link flow

---

## Out of scope

- Email notifications on new sign-up (deferred to future admin interface)
- Any change to the `/auth/callback` route
- Any change to Supabase auth settings
- Mobile nav (no hamburger menu exists yet)
