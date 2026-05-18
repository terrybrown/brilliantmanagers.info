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
```

`NEXT_PUBLIC_*` values come from your Supabase project's API settings. `SUPABASE_SERVICE_ROLE_KEY` is the service role secret — never expose it client-side. `ANTHROPIC_API_KEY` powers AI-assisted features. Mailgun keys are for transactional email.

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

## License

MIT
