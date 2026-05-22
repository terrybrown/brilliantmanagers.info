# Brilliant Managers

Brilliant Managers is a management effectiveness tool for engineering managers. It tracks scores across five pillars — Self, Team, Strategy, Communications, and Domain Expertise — supports 360-degree feedback by connecting with your manager, and visualises progress across multiple reflection rounds.

![Dashboard](docs/screenshots/dashboard.png)

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| Auth & database | Supabase (Postgres with Row Level Security) |
| Styling | Tailwind CSS v4, Radix UI, shadcn/ui |
| Testing | Vitest + Testing Library |
| Deployment | Netlify |
| Error monitoring | Sentry |
| Analytics | Google Analytics 4 |

## Getting started

### Prerequisites

- Node.js 18+
- A Supabase project (free tier is fine)

### Environment

Create `.env.local` in the project root:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
MAILGUN_API_KEY=
MAILGUN_BASE_URL=
MAILGUN_SENDING_KEY=
NEXT_PUBLIC_SENTRY_DSN=
NEXT_PUBLIC_SLEEKPLAN_PRODUCT_ID=
```

`NEXT_PUBLIC_*` values come from your Supabase project's API settings. `SUPABASE_SERVICE_ROLE_KEY` is the service role secret — never expose it client-side. `ANTHROPIC_API_KEY` powers AI-assisted features. Mailgun keys are for transactional email. `NEXT_PUBLIC_SENTRY_DSN` comes from your Sentry project settings. `NEXT_PUBLIC_SLEEKPLAN_PRODUCT_ID` comes from your Sleekplan workspace.

Netlify build-only (not needed locally): `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`.

### Run locally

```bash
npm install
npm run dev     # http://localhost:3000
npm test        # run test suite
```

## Contributing

1. Fork the repo and create a branch: `git checkout -b my-change`
2. Make your changes and write tests for any new behaviour
3. Run `npm test` — all tests must pass
4. Open a pull request against `master`

New tables in Supabase must have Row Level Security enabled with explicit policies for every operation. See the [RLS rules in CLAUDE.md](CLAUDE.md#supabase--database-rules) for the full checklist.

## Roadmap

Outstanding features and known gaps:

- **Dashboard — pillar drill-down**: Tapping a pillar should open a deep-dive view (score history graph per section, skill breakdown) with a clear route back to the dashboard. We had per-section graphs previously; the goal is to bring that back as a drill-down rather than a separate page.
- **Score history chart — hover/tooltip**: The all-rounds chart on the dashboard should show values on hover so users can read exact scores without guessing from the axis.
- **Radar chart — hover/tooltip**: Hovering a vertex on the radar should surface the pillar name and score.
- **Fix Organisations**: The multi-org flow has known issues that need investigation and fixing.
- **Growth section — polish**: Active Goals, Top Opportunities, and the Skills Table are built. Remaining: progress tracking over time (linking to Reflections data), and goal evidence/check-in improvements.
- **Toast notifications**: Surface action confirmations and errors as toast notifications — likely [Sonner via shadcn/ui](https://ui.shadcn.com/docs/components/radix/sonner).
- **Reflection detail — skill drill-down**: The `/reflections/[id]` pillar table should expand each row to reveal individual skill scores. No new DB queries needed — scores are already stored at skill level. Four things inside each expanded pillar:
  - **Skill breakdown**: each skill in the pillar listed with its level badge and numeric score, so "Self" stops being an opaque 4.2 average and shows Self-Awareness: Advanced, Growth Mindset: Proficient, etc.
  - **Manager gap per skill**: when a manager has scored, surface their rating and the gap at the skill level — "your manager rated Stakeholder Influence 2 levels higher than you did" is far more actionable than a +1.2 pillar average.
  - **Skill trend sparklines**: a small inline chart per skill showing that skill's score across all previous rounds, so you can see at a glance whether Self-Awareness has been climbing, stagnating, or regressing over time.
  - **Round-over-round delta**: a Δ badge on each skill (and on the pillar row itself) showing the change vs the prior completed round, coloured green/amber/red.
- **Reflection reminders — phase 2**: Email reminders for reflection rounds. One-off: email sent on a user-chosen "remind me by" date. Recurring: a cadence setting (monthly/quarterly/bi-annual) in Profile → Notifications that triggers a nudge to start a new round. The DB fields (`remind_at` on `assessment_rounds`, `reflection_cadence` on profiles) are added in the Reflections page build; this phase adds the scheduled job (Netlify cron or Supabase Edge Function) and the Profile settings UI. See [design spec](docs/superpowers/specs/2026-05-21-reflections-page-design.md#reminders-stored-not-sent--phase-2-for-delivery).

## Delivered

Features that have shipped:

- **Observability** *(May 2026)*: GA4 custom event tracking across 9 user actions (round started/viewed/completed, pillar scored, scorecard completed, goal created, goal check-in, manager invited, connection accepted). Sentry error monitoring on server and client with source map upload for readable stack traces.
- **Reflections page** *(May 2026)*: `/reflections` list page with active round card, 4-stat bar, trend chart with pillar tabs and manager overlay, and history table. `/reflections/[id]` detail page with radar, pillar breakdown table (your score, manager score, gap, level badge). `ScheduleWidget` replaced by `ActiveRoundCard` on the dashboard. Round creation via `CreateRoundModal` (title, remind-me date, intention).
- **People page and connections consolidation** *(May 2026)*: `/people` replaces the separate Connections and Organisation sections. Single page for all relationships — your manager, your direct reports, pending invites, and org chart. `/connections` and `/organisation` redirect to `/people`. Org chart supports inline child node creation, avatar stacks, and a member management panel.
- **The Tool page redesign** *(May 2026)*: `/the-tool` rebuilt as the primary signup pathway — hero with "Join now" OTP form, offline fallback strip linking to Google Sheets, and three alternating feature rows with real app screenshots. Measurement pillar removed (was empty); all copy updated to five pillars.
- **Invite unregistered users** *(May 2026)*: Inviting a connection whose email has no account now sends them an invite email with a registration link. Their connection activates automatically when they verify their OTP — no manual coordination required.
- **User feedback** *(May 2026)*: Sleekplan feedback widget integrated into all authenticated app pages. Users can submit ideas, view the roadmap, and report bugs without leaving the product.

## License

MIT
