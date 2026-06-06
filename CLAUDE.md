# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

`brilliantmanagers.info` — a Next.js 16 (App Router) application for management effectiveness scoring. Deployed via Netlify. Auth and database are handled by Supabase.

## Working conventions

**Adding to the roadmap**: When the user highlights text or pastes an idea and asks to add it to the roadmap (or the intent is clearly to add a roadmap item), immediately execute the `add-to-roadmap` skill without asking for confirmation. Do not ask clarifying questions — derive a sensible title and description from the text and run the full workflow (branch → edit README → commit → push → PR → squash merge).

**All new work starts on a new branch.** Never commit directly to `master` or add changes to an existing branch that already has an open or merged PR. Create a branch before touching any files.

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
    people/             # team and connections hub (invite, view, accept)
    reflections/        # reflection rounds list + detail (/reflections/[id])
    growth/
    profile/
    notifications/
    admin/
    connections/        # stub — redirects to /people
    organisation/       # stub — redirects to /people
    manager/            # stub — redirects to /people
    error.tsx           # authenticated route error boundary (reports to Sentry)
    layout.tsx          # app shell with sidebar nav
  auth/               # Supabase auth callbacks (/auth/confirm, /auth/callback)
  blog/               # public blog index + posts
  login/              # unauthenticated entry point
  resources/          # public resources page
  the-guide/          # public management guide (MDX)
  the-tool/           # public product page
  global-error.tsx    # root-level error boundary (reports to Sentry)
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

Supabase migrations live in `supabase/migrations/`, named `YYYYMMDDNNNNNN_description.sql` and applied in filename sort order. Run them sequentially against your Supabase project. Email templates are in `supabase/templates/`.

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
| `NEXT_PUBLIC_SLEEKPLAN_PRODUCT_ID` | Client only (Sleekplan feedback widget) |
| `NEXT_PUBLIC_SENTRY_DSN` | Client + server (Sentry error monitoring) |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Client only (Cloudflare Turnstile bot prevention) |
| `SENTRY_AUTH_TOKEN` | Netlify build env only — never commit, never `.env.local` |
| `SENTRY_ORG` | Netlify build env only |
| `SENTRY_PROJECT` | Netlify build env only |

Never put `SUPABASE_SERVICE_ROLE_KEY` or any non-`NEXT_PUBLIC_` key in client-side code. `SENTRY_AUTH_TOKEN` must never appear in `.env.local` or any committed file — it belongs only in Netlify's build environment settings.

## Analytics

User-facing actions are tracked via GA4 through `lib/analytics.ts`. Every exported function is a one-liner wrapper around `window.gtag` with an SSR guard. When adding a new user action (form submit, button click, modal confirm), add a corresponding `track*` call in `lib/analytics.ts` and call it at the point of success. Existing tracked events: `trackRoundStarted`, `trackReflectionViewed`, `trackRoundCompleted`, `trackPillarScored`, `trackScorecardCompleted`, `trackGoalCreated`, `trackGoalCheckin`, `trackManagerInvited`, `trackConnectionAccepted`.

For actions that trigger a server action ending in `redirect()`, fire the analytics call _before_ the `await` — any code after `redirect()` never executes on the client.

## Things that bite

- **`searchParams` is a Promise in Next.js 15+** — always `await searchParams` in page components that receive it as a prop.
- **Supabase client creation** — use `createServerClient` (from `@supabase/ssr`) in server components and API routes; use `createBrowserClient` in client components. The browser client must not receive the service role key.
- **Microsoft Safe Links** — the email OTP flow uses `/auth/confirm` with `token_hash` + `verifyOtp` rather than the default magic link, to prevent Safe Links from consuming the token before the user clicks.
- **RLS on every table** — see section below. A table without RLS is either fully open or fully broken.
- **Sentry + Next.js 15 App Router** — `instrumentation.ts` must export `export const onRequestError = Sentry.captureRequestError`. Without it, server component and server action errors are not forwarded to Sentry. The `register()` function must also handle both `nodejs` and `edge` runtimes.
- **React Strict Mode double-fire** — `useEffect` hooks that trigger analytics on state changes will fire twice in development. Guard with a `useRef(false)` flag set to `true` on first fire.

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

---

## Design system — Sage

Light, calm, modern coaching tool. Full spec: `design_handoff_sage_redesign/README.md`.

### Colour — never hardcode; always use tokens

All colour comes from the `@theme` tokens in `app/globals.css` (see `design_handoff_sage_redesign/sage-tokens.css`). Do not introduce raw hex or `rgba(255,255,255,…)` values in components.

- **Brand accent**: `--color-accent` (teal `#0E7C6B`); text on it `--color-accent-fg`.
  Tints: `--color-accent-wash` (subtle bg), `--color-accent-wash2` (chips/active), `--color-accent-border`.
- **Manager / secondary data series**: `--color-manager` (amber `#CC7A1A`).
- **Text**: `--color-text-primary` / `--color-text-muted` / `--color-text-faint`.
- **Surfaces**: `--color-bg-base` (canvas), `--color-surface` (cards), `--color-nav-bg` (sidebar/panels).
  Borders `--color-border`, tracks `--color-track`, chips `--color-chip-bg`.
- **Semantic**: `--color-positive` / `--color-negative`; alerts `--color-alert-fg|bg|border`.

### Data-viz mapping (apply everywhere, consistently)

- **Self** = solid line / filled bar, `--color-accent` (teal).
- **Manager** = dashed line / 2px tick / point, `--color-manager` (amber).
- Score grading: ≤2 (or ≤2.4 for pillar avgs) → negative/alert; ≥4 → positive; else neutral/muted.
- Delta pills: positive → green up, negative → red down.

### Typography

- `--font-display` (Bricolage Grotesque) for headings, titles, big numbers.
- `--font-body` (Hanken Grotesk) for everything else.
- Page title 24/700; card title 13.5–14/700; stat number 26–32/700; body 12.5–14; caption 11.

### Layout & components

- **Cards**: `--color-surface`, 1px `--color-border`, radius `--radius`/`--radius-lg`, shadow `0 1px 2px rgba(40,60,45,.04), 0 2px 5px rgba(40,60,45,.03)`.
- **App chrome**: ONE left sidebar (232px) + top bar (breadcrumb + title, search, optional period, primary action). No second/marketing nav inside the app.
- **Content**: fill the width — 2-column grids (main + 296px action rail) over narrow centered columns.
- **Buttons**: primary = teal fill, hover `--btn-primary-bg-hover`; secondary = bordered ghost. Min 44px touch targets on mobile.
- **Icons**: lucide-react only.

### Don't

- Don't reintroduce dark backgrounds or the old amber-as-brand accent.
- Don't hardcode colours / `rgba(255,255,255,…)`.
- Don't add filler sections, dummy stats, or decorative gradients.
- Don't split nav into two bars again.
