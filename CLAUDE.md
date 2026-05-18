# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

`brilliantmanagers.info` — a Next.js 16 (App Router) application for management effectiveness scoring. Deployed via Netlify. Auth and database are handled by Supabase.

## Commands

```bash
npm install           # install deps (Node 18+)
npm run dev           # local dev server at http://localhost:3000
npm run build         # production build
npm test              # run Vitest test suite (non-interactive)
npm run test:watch    # Vitest in watch mode
npm run lint          # ESLint
```

## Architecture

### Route structure

The app uses Next.js App Router. Routes are split between public pages and an authenticated app shell:

```
app/
  (app)/              # authenticated route group — middleware guards all of these
    dashboard/
    scorecard/
    results/
    connections/
    manager/
    organisation/
    growth/
    profile/
    notifications/
    admin/
    layout.tsx          # app shell with sidebar nav
  auth/               # Supabase auth callbacks (/auth/confirm, /auth/callback)
  blog/               # public blog index + posts
  login/              # unauthenticated entry point
  resources/          # public resources page
  the-guide/          # public management guide (MDX)
  the-tool/           # public product page
  layout.tsx          # root layout (ThemeProvider, fonts)
  page.tsx            # marketing home page
```

Authentication is enforced in `middleware.ts`: any route in `APP_ROUTES` redirects to `/login` if there is no Supabase session. Authenticated users visiting `/login` are redirected to `/dashboard`.

### Content authoring

Static content (the guide, blog) lives in `content/` as MDX files:

- `content/guide/*.mdx` — management guide sections (one file per pillar + index)
- `content/blog/*.mdx` — blog posts

These are rendered server-side via `next-mdx-remote`. No build step or frontmatter template is required — just add an MDX file and link to it.

### Components

UI components live in `components/`. shadcn/ui components are generated there via `npx shadcn add`. Radix UI primitives and Tailwind CSS v4 are the base layer.

### Styling

All global styles in `app/globals.css`. Tailwind CSS v4 with `@tailwindcss/postcss`. The site is permanently dark — colour tokens are defined once in `@theme` with no light/dark switching. Do not use `dark:` Tailwind variants.

### Database

Supabase migrations live in `supabase/migrations/`. Run them in order against your Supabase project. Email templates are in `supabase/templates/`.

### Testing

Tests live in `__tests__/`, mirroring the source tree. Vitest + Testing Library. Run `npm test` before any commit.

### Environment variables

| Variable | Where used |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Client + server |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client + server |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only (API routes, server actions) |
| `ANTHROPIC_API_KEY` | Server only |
| `MAILGUN_API_KEY` | Server only |
| `MAILGUN_BASE_URL` | Server only |
| `MAILGUN_SENDING_KEY` | Server only |

Never put `SUPABASE_SERVICE_ROLE_KEY` or any non-`NEXT_PUBLIC_` key in client-side code.

## Things that bite

- **`searchParams` is a Promise in Next.js 15+** — always `await searchParams` in page components that receive it as a prop.
- **Supabase client creation** — use `createServerClient` (from `@supabase/ssr`) in server components and API routes; use `createBrowserClient` in client components. The browser client must not receive the service role key.
- **Microsoft Safe Links** — the email OTP flow uses `/auth/confirm` with `token_hash` + `verifyOtp` rather than the default magic link, to prevent Safe Links from consuming the token before the user clicks.
- **RLS on every table** — see section below. A table without RLS is either fully open or fully broken.

## Supabase / database rules

Every table in the `public` schema must have Row Level Security enabled and at least one policy per operation that the app uses. These are non-negotiable — a table with RLS off, or with RLS on but no policies, is either fully open or fully broken.

### Checklist for any new table

1. **Enable RLS immediately** — `ALTER TABLE <table> ENABLE ROW LEVEL SECURITY;` before any data or policies are added.
2. **Write a policy for every operation the app performs** (SELECT, INSERT, UPDATE, DELETE). Never leave an operation uncovered and rely on "default deny" — make the intent explicit.
3. **All policies must gate on `auth.uid()`** — the USING / WITH CHECK expression must reference `auth.uid()`, directly or via a subquery to another table. A policy with `USING (true)` is equivalent to no RLS.
4. **Do not read sensitive env vars in edge middleware** — Next.js inlines `process.env` into the edge bundle at build time. Keep sensitive env var reads in Node.js runtime code (server components, server actions, API routes).
5. **Never use the service role key in client code or `NEXT_PUBLIC_` variables** — it bypasses RLS entirely. Only the anon key belongs in the client bundle.

### Verifying a new table

After creating a table and its policies, confirm with unauthenticated curl requests that SELECT and INSERT are both rejected:

```bash
SUPABASE_URL="https://jxanausntacmzgnzzncu.supabase.co"
ANON_KEY="$NEXT_PUBLIC_SUPABASE_ANON_KEY"

# Should return []
curl -s -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY" \
  "$SUPABASE_URL/rest/v1/<table>?select=*"

# Should return a 42501 RLS violation, not success
curl -s -X POST -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{...}' "$SUPABASE_URL/rest/v1/<table>"
```
