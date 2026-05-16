# Manager Scorecard App — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an auth-gated web scorecard into brilliantmanagers.info — users score themselves across 5 pillars, save snapshots, and optionally compare with their manager's scores.

**Architecture:** New `(app)` route group sits alongside existing pages inside the Next.js App Router. Next.js middleware (edge) handles session refresh + beta allowlist gate. Supabase provides magic-link auth and PostgreSQL with RLS. Recharts renders radar and grouped bar charts on the results page. Scores save instantly on click via server actions — no submit button.

**Tech Stack:** Next.js 16 App Router · `@supabase/supabase-js` + `@supabase/ssr` · Recharts · Vitest + React Testing Library · Netlify (existing)

---

## File Map

**Create:**
- `supabase/migrations/001_initial_schema.sql` — all tables + RLS
- `lib/supabase/client.ts` — browser Supabase client
- `lib/supabase/server.ts` — server-component Supabase client
- `lib/skills.ts` — full skill registry (36 skills, 5 pillars)
- `middleware.ts` — session refresh + app route protection
- `app/(app)/layout.tsx` — secondary session + beta check
- `app/(app)/scorecard/page.tsx` — pillar picker home
- `app/(app)/scorecard/[pillar]/page.tsx` — scoring view shell (server)
- `app/(app)/scorecard/[pillar]/actions.ts` — saveScore server action
- `app/(app)/results/page.tsx` — results shell (server)
- `app/(app)/connections/page.tsx` — connections shell (server)
- `app/(app)/connections/actions.ts` — createConnection server action
- `app/(app)/manager/[userId]/page.tsx` — manager scoring shell
- `app/(app)/manager/[userId]/actions.ts` — saveManagerScore server action
- `app/login/page.tsx` — magic link form
- `app/auth/callback/route.ts` — code exchange + profile upsert
- `lib/db/rounds.ts` — round helpers
- `lib/db/scores.ts` — score helpers
- `lib/db/connections.ts` — connection helpers
- `lib/db/manager-scores.ts` — manager score helpers
- `components/app/ScoringView.tsx` — client: renders SkillCards for a pillar
- `components/app/SkillCard.tsx` — client: expanded/collapsed skill row
- `components/app/PillarRow.tsx` — pillar card in picker + results list
- `components/app/ScorecardRadarChart.tsx` — Recharts radar wrapper
- `components/app/SkillBarChart.tsx` — Recharts grouped bar wrapper
- `components/app/ResultsPillarList.tsx` — client: expandable pillar list
- `__tests__/lib/skills.test.ts`
- `__tests__/components/app/SkillCard.test.tsx`

**Modify:**
- `package.json` — add recharts, @supabase/supabase-js, @supabase/ssr
- `app/the-tool/page.tsx` — add beta CTA

---

## Task 1: Install packages

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install**

```bash
cd /Users/terry.brown/work/personal/brilliantmanagers.info
npm install @supabase/supabase-js @supabase/ssr recharts
```

- [ ] **Step 2: Verify**

```bash
grep -E '"(@supabase|recharts)"' package.json
```

Expected: three lines showing `@supabase/supabase-js`, `@supabase/ssr`, `recharts` in `dependencies`.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: install supabase and recharts packages"
```

---

## Task 2: SQL schema

**Files:**
- Create: `supabase/migrations/001_initial_schema.sql`

- [ ] **Step 1: Create migration**

Create `supabase/migrations/001_initial_schema.sql`:

```sql
-- profiles: extends auth.users, created on first sign-in
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text,
  email text,
  created_at timestamptz default now()
);
alter table profiles enable row level security;
create policy "Users can read own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on profiles for insert with check (auth.uid() = id);

-- assessment_rounds: one per reflection session, never overwritten
create table assessment_rounds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles on delete cascade,
  status text not null default 'in_progress' check (status in ('in_progress', 'complete')),
  created_at timestamptz default now(),
  completed_at timestamptz
);
alter table assessment_rounds enable row level security;
create policy "Users can manage own rounds" on assessment_rounds
  for all using (auth.uid() = user_id);

-- scores: one row per skill per round
create table scores (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references assessment_rounds on delete cascade,
  pillar text not null,
  skill_key text not null,
  level text not null check (level in ('Needs Improvement', 'Basic', 'Proficient', 'Advanced', 'Expert')),
  scored_at timestamptz default now(),
  unique (round_id, skill_key)
);
alter table scores enable row level security;
create policy "Users can manage scores for own rounds" on scores
  for all using (
    exists (
      select 1 from assessment_rounds
      where id = scores.round_id and user_id = auth.uid()
    )
  );
create policy "Managers can read scores for direct reports" on scores
  for select using (
    exists (
      select 1 from assessment_rounds ar
      join connections c on c.direct_report_id = ar.user_id
      where ar.id = scores.round_id
        and c.manager_id = auth.uid()
        and c.status = 'active'
    )
  );

-- connections: bidirectional manager/direct-report link
create table connections (
  id uuid primary key default gen_random_uuid(),
  manager_id uuid not null references profiles on delete cascade,
  direct_report_id uuid not null references profiles on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'active')),
  initiated_by uuid not null references profiles on delete cascade,
  created_at timestamptz default now(),
  unique (manager_id, direct_report_id)
);
alter table connections enable row level security;
create policy "Users can read connections they are part of" on connections
  for select using (auth.uid() = manager_id or auth.uid() = direct_report_id);
create policy "Users can create connections involving themselves" on connections
  for insert with check (
    auth.uid() = initiated_by and
    (auth.uid() = manager_id or auth.uid() = direct_report_id)
  );
create policy "Users can update connections they are part of" on connections
  for update using (auth.uid() = manager_id or auth.uid() = direct_report_id);

-- manager_scores: manager's ratings linked to the direct report's round
create table manager_scores (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references assessment_rounds on delete cascade,
  manager_id uuid not null references profiles on delete cascade,
  skill_key text not null,
  level text not null check (level in ('Needs Improvement', 'Basic', 'Proficient', 'Advanced', 'Expert')),
  scored_at timestamptz default now(),
  unique (round_id, manager_id, skill_key)
);
alter table manager_scores enable row level security;
create policy "Managers can manage their own manager scores" on manager_scores
  for all using (auth.uid() = manager_id);
create policy "Direct reports can read their manager scores" on manager_scores
  for select using (
    exists (
      select 1 from assessment_rounds
      where id = manager_scores.round_id and user_id = auth.uid()
    )
  );
```

- [ ] **Step 2: Run in Supabase**

Go to your Supabase project → SQL Editor → paste the file contents → Run.
Verify: all 4 tables appear in the Table Editor.

- [ ] **Step 3: Set env vars**

Create `.env.local` (not committed) with:
```
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
APP_BETA_EMAILS=terry.brown@mews.com
```

Get values from Supabase Dashboard → Settings → API.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/001_initial_schema.sql
git commit -m "feat: add supabase sql schema for scorecard app"
```

---

## Task 3: Supabase client helpers

**Files:**
- Create: `lib/supabase/client.ts`
- Create: `lib/supabase/server.ts`

- [ ] **Step 1: Create browser client** (`lib/supabase/client.ts`)

```ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

- [ ] **Step 2: Create server client** (`lib/supabase/server.ts`)

```ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // setAll called from a server component — cookies are read-only
          }
        },
      },
    }
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/supabase/
git commit -m "feat: add supabase client helpers for browser and server"
```

---

## Task 4: Skill registry (lib/skills.ts)

**Files:**
- Create: `lib/skills.ts`
- Create: `__tests__/lib/skills.test.ts`

- [ ] **Step 1: Write failing test** (`__tests__/lib/skills.test.ts`)

```ts
import { describe, it, expect } from 'vitest'
import { SKILLS, PILLARS, LEVELS, getSkillsByPillar } from '@/lib/skills'

describe('SKILLS', () => {
  it('has 36 skills', () => {
    expect(SKILLS).toHaveLength(36)
  })

  it('every skill has a unique key', () => {
    const keys = SKILLS.map(s => s.key)
    expect(new Set(keys).size).toBe(SKILLS.length)
  })

  it('every skill belongs to a valid pillar', () => {
    SKILLS.forEach(s => {
      expect(PILLARS).toContain(s.pillar)
    })
  })

  it('every skill has a non-empty label and description', () => {
    SKILLS.forEach(s => {
      expect(s.label.length).toBeGreaterThan(0)
      expect(s.description.length).toBeGreaterThan(0)
    })
  })

  it('getSkillsByPillar returns correct count', () => {
    expect(getSkillsByPillar('self')).toHaveLength(9)
    expect(getSkillsByPillar('team')).toHaveLength(11)
    expect(getSkillsByPillar('strategy')).toHaveLength(8)
    expect(getSkillsByPillar('communications')).toHaveLength(6)
    expect(getSkillsByPillar('domain-expertise')).toHaveLength(2)
  })
})
```

- [ ] **Step 2: Run test — verify it fails**

```bash
npx vitest run __tests__/lib/skills.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/skills'`

- [ ] **Step 3: Create lib/skills.ts**

```ts
export interface Skill {
  key: string
  pillar: 'self' | 'team' | 'strategy' | 'communications' | 'domain-expertise'
  label: string
  description: string
}

export const PILLARS = ['self', 'team', 'strategy', 'communications', 'domain-expertise'] as const
export type Pillar = (typeof PILLARS)[number]

export const PILLAR_LABELS: Record<Pillar, string> = {
  self: 'Self',
  team: 'Team',
  strategy: 'Strategy',
  communications: 'Communications',
  'domain-expertise': 'Domain Expertise',
}

export const LEVELS = ['Needs Improvement', 'Basic', 'Proficient', 'Advanced', 'Expert'] as const
export type Level = (typeof LEVELS)[number]

export const LEVEL_VALUES: Record<Level, number> = {
  'Needs Improvement': 1,
  Basic: 2,
  Proficient: 3,
  Advanced: 4,
  Expert: 5,
}

export const LEVEL_COLORS: Record<Level, string> = {
  'Needs Improvement': '#f87171',
  Basic: '#fb923c',
  Proficient: '#fbbf24',
  Advanced: '#4ade80',
  Expert: '#a78bfa',
}

export const SKILLS: Skill[] = [
  // Self — 9 skills
  { key: 'self-time-task-management', pillar: 'self', label: 'Time & Task Management', description: 'How well you prioritise, plan, and protect your own time to stay effective without burning out.' },
  { key: 'self-empathy-compassion', pillar: 'self', label: 'Empathy & Compassion', description: 'Your ability to understand and genuinely care about the people around you, making them feel seen and supported.' },
  { key: 'self-growth-mindset', pillar: 'self', label: 'Growth Mindset', description: 'Whether you actively seek challenge, feedback, and learning rather than protecting your existing reputation.' },
  { key: 'self-emotional-intelligence', pillar: 'self', label: 'Emotional Intelligence', description: 'How well you read your own emotions and those of others, and use that awareness to respond rather than react.' },
  { key: 'self-leadership-styles', pillar: 'self', label: 'Leadership Styles', description: 'How flexibly you shift your approach between directing, coaching, supporting, and delegating based on what each person needs.' },
  { key: 'self-self-awareness', pillar: 'self', label: 'Self Awareness', description: 'How clearly you see your own strengths, blind spots, and impact on others — not just your intentions.' },
  { key: 'self-cross-functional-skillset', pillar: 'self', label: 'Cross-functional Skillset', description: 'The breadth of skills you bring beyond your core domain that help you lead across functions and contexts.' },
  { key: 'self-resilience', pillar: 'self', label: 'Resilience', description: 'How consistently you maintain your effectiveness under pressure, ambiguity, or sustained difficulty.' },
  { key: 'self-vulnerability-courage', pillar: 'self', label: 'Vulnerability & Courage', description: 'Your willingness to admit uncertainty, share honest feedback, and take stands that might not be popular.' },
  // Team — 11 skills
  { key: 'team-dei', pillar: 'team', label: 'Diversity, Equity & Inclusion', description: 'How actively you build an environment where people from all backgrounds can contribute fully and feel they belong.' },
  { key: 'team-coaching-mentoring', pillar: 'team', label: 'Coaching & Mentoring', description: 'Your ability to develop others through questions, frameworks, and space rather than just providing answers.' },
  { key: 'team-one-to-ones', pillar: 'team', label: 'One-to-Ones', description: 'How well you use regular one-to-one meetings to build trust, address blockers, and support each person\'s growth.' },
  { key: 'team-growth-progression', pillar: 'team', label: 'Growth & Progression', description: 'How effectively you identify development opportunities and actively support each person\'s career progression.' },
  { key: 'team-performance-discipline', pillar: 'team', label: 'Performance & Discipline', description: 'How consistently you set clear expectations and address underperformance early and fairly.' },
  { key: 'team-accountability', pillar: 'team', label: 'Accountability', description: 'How well you create a culture where people take ownership of outcomes, not just tasks.' },
  { key: 'team-unblocking', pillar: 'team', label: 'Unblocking', description: 'How quickly and effectively you remove obstacles that stop your team from doing their best work.' },
  { key: 'team-recruitment', pillar: 'team', label: 'Recruitment', description: 'How well you attract, assess, and hire people who will both perform and strengthen the team culture.' },
  { key: 'team-onboarding', pillar: 'team', label: 'Onboarding', description: 'How effectively you help new joiners become productive, connected, and confident contributors.' },
  { key: 'team-psychological-safety', pillar: 'team', label: 'Psychological Safety & Team Wellbeing', description: 'How consistently you create an environment where people feel safe to speak up, take risks, and be honest.' },
  { key: 'team-cross-team-collaboration', pillar: 'team', label: 'Cross-team Collaboration', description: 'How well you build productive working relationships with other teams and break down silos.' },
  // Strategy — 8 skills
  { key: 'strategy-vision-creation', pillar: 'strategy', label: 'Strategy & Vision Creation', description: 'How clearly you define and communicate where the team is going and why it matters.' },
  { key: 'strategy-culture-driving', pillar: 'strategy', label: 'Culture Driving', description: 'How intentionally you shape the norms, behaviours, and values that define how your team works.' },
  { key: 'strategy-goal-setting', pillar: 'strategy', label: 'Goal Setting', description: 'How effectively you translate vision into clear, measurable goals that the team can act on.' },
  { key: 'strategy-change-management', pillar: 'strategy', label: 'Change Management', description: 'How well you lead your team through organisational change, keeping people informed and aligned.' },
  { key: 'strategy-data-driven-decisions', pillar: 'strategy', label: 'Data-Driven Decision Making', description: 'How consistently you use data to inform decisions rather than relying solely on intuition.' },
  { key: 'strategy-stakeholder-management', pillar: 'strategy', label: 'Stakeholder Management', description: 'How well you identify, influence, and communicate with the people who have a stake in your team\'s work.' },
  { key: 'strategy-resource-planning', pillar: 'strategy', label: 'Resource Planning & Allocation', description: 'How effectively you plan and allocate people, budget, and time to match strategic priorities.' },
  { key: 'strategy-innovation-experimentation', pillar: 'strategy', label: 'Innovation & Experimentation', description: 'How actively you create space for new ideas and run structured experiments rather than defaulting to the familiar.' },
  // Communications — 6 skills
  { key: 'comms-relationships-partnerships', pillar: 'communications', label: 'Relationships & Partnerships', description: 'How well you build genuine, trust-based relationships across your organisation and beyond.' },
  { key: 'comms-communication-excellence', pillar: 'communications', label: 'Communication Excellence', description: 'How clearly and consistently you communicate — in writing, in person, and in meetings — across different audiences.' },
  { key: 'comms-listening', pillar: 'communications', label: 'Listening', description: 'How genuinely you listen to understand rather than to respond, and how that shows up in what you do with what you hear.' },
  { key: 'comms-storytelling', pillar: 'communications', label: 'Storytelling', description: 'How effectively you use narrative and context to make ideas compelling and memorable.' },
  { key: 'comms-feedback', pillar: 'communications', label: 'Feedback', description: 'How consistently you give specific, timely, and useful feedback — both positive and developmental.' },
  { key: 'comms-difficult-conversations', pillar: 'communications', label: 'Difficult Conversations & Conflict Resolution', description: 'How well you handle conflict, disagreement, and uncomfortable truths in a way that builds rather than breaks trust.' },
  // Domain Expertise — 2 skills
  { key: 'domain-process-innovation', pillar: 'domain-expertise', label: 'Process Innovation & Optimization', description: 'How actively you identify and improve the processes, systems, and ways of working within your domain.' },
  { key: 'domain-technical-mastery', pillar: 'domain-expertise', label: 'Technical Mastery Within Your Domain', description: 'The depth of expertise you bring in your core domain, and how you use it to raise the quality of your team\'s work.' },
]

export function getSkillsByPillar(pillar: Pillar): Skill[] {
  return SKILLS.filter(s => s.pillar === pillar)
}
```

- [ ] **Step 4: Run test — verify it passes**

```bash
npx vitest run __tests__/lib/skills.test.ts
```

Expected: 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add lib/skills.ts __tests__/lib/skills.test.ts
git commit -m "feat: add skill registry with 36 skills across 5 pillars"
```

---

## Task 5: Middleware

**Files:**
- Create: `middleware.ts`

- [ ] **Step 1: Create middleware.ts**

```ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const APP_ROUTES = ['/scorecard', '/results', '/connections', '/manager']

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session — do not add code between here and getUser()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname
  const isAppRoute = APP_ROUTES.some(r => path.startsWith(r))

  if (isAppRoute) {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    const betaEmails = process.env.APP_BETA_EMAILS
    if (betaEmails) {
      const allowed = betaEmails.split(',').map(e => e.trim())
      if (!allowed.includes(user.email ?? '')) {
        return NextResponse.redirect(new URL('/the-tool', request.url))
      }
    }
  }

  // Redirect authenticated users away from login
  if (path === '/login' && user) {
    return NextResponse.redirect(new URL('/scorecard', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

- [ ] **Step 2: Verify no TypeScript errors**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add middleware.ts
git commit -m "feat: add middleware for session refresh and app route protection"
```

---

## Task 6: (app) layout

**Files:**
- Create: `app/(app)/layout.tsx`

- [ ] **Step 1: Create layout**

```tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const betaEmails = process.env.APP_BETA_EMAILS
  if (betaEmails) {
    const allowed = betaEmails.split(',').map(e => e.trim())
    if (!allowed.includes(user.email ?? '')) {
      redirect('/the-tool')
    }
  }

  return <>{children}</>
}
```

- [ ] **Step 2: Commit**

```bash
git add app/\(app\)/
git commit -m "feat: add (app) route group layout with auth + beta gate"
```

---

## Task 7: Login page

**Files:**
- Create: `app/login/page.tsx`

- [ ] **Step 1: Create login page**

```tsx
'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const supabase = createClient()
    const { error: err } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (err) {
      setError(err.message)
    } else {
      setSent(true)
    }
  }

  if (sent) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="max-w-sm text-center">
          <h1 className="mb-2 text-2xl font-bold">Check your email</h1>
          <p className="text-slate-500">
            We sent a magic link to <strong>{email}</strong>. Click it to sign in.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-6 text-2xl font-bold">Sign in</h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="your@email.com"
            required
            className="rounded-lg border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            type="submit"
            className="rounded-lg bg-amber-500 px-4 py-3 text-sm font-semibold text-white hover:bg-amber-400"
          >
            Send magic link
          </button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/login/
git commit -m "feat: add magic link login page"
```

---

## Task 8: Auth callback route

**Files:**
- Create: `app/auth/callback/route.ts`

- [ ] **Step 1: Create route handler**

```ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    const {
      data: { user },
    } = await supabase.auth.exchangeCodeForSession(code)

    if (user) {
      // Create profile on first sign-in, no-op on subsequent
      await supabase.from('profiles').upsert(
        {
          id: user.id,
          email: user.email,
          display_name: user.email?.split('@')[0] ?? '',
        },
        { onConflict: 'id' }
      )
    }
  }

  return NextResponse.redirect(new URL('/scorecard', request.url))
}
```

- [ ] **Step 2: Commit**

```bash
git add app/auth/
git commit -m "feat: add auth callback route with profile upsert"
```

---

## Task 9: DB helpers — rounds and scores

**Files:**
- Create: `lib/db/rounds.ts`
- Create: `lib/db/scores.ts`

- [ ] **Step 1: Create lib/db/rounds.ts**

```ts
import { createClient } from '@/lib/supabase/server'
import { PILLARS } from '@/lib/skills'

export interface Round {
  id: string
  user_id: string
  status: 'in_progress' | 'complete'
  created_at: string
  completed_at: string | null
}

export async function getOrCreateActiveRound(userId: string): Promise<Round> {
  const supabase = await createClient()

  const { data: existing } = await supabase
    .from('assessment_rounds')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'in_progress')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existing) return existing as Round

  const { data, error } = await supabase
    .from('assessment_rounds')
    .insert({ user_id: userId, status: 'in_progress' })
    .select()
    .single()

  if (error) throw error
  return data as Round
}

export async function getLatestCompleteRound(userId: string): Promise<Round | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('assessment_rounds')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'complete')
    .order('completed_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data as Round | null
}

export async function maybeCompleteRound(roundId: string): Promise<void> {
  const supabase = await createClient()
  const { data: scores } = await supabase
    .from('scores')
    .select('pillar')
    .eq('round_id', roundId)

  const scoredPillars = new Set((scores ?? []).map((s: { pillar: string }) => s.pillar))
  if (PILLARS.every(p => scoredPillars.has(p))) {
    await supabase
      .from('assessment_rounds')
      .update({ status: 'complete', completed_at: new Date().toISOString() })
      .eq('id', roundId)
  }
}
```

- [ ] **Step 2: Create lib/db/scores.ts**

```ts
import { createClient } from '@/lib/supabase/server'
import type { Level } from '@/lib/skills'

export interface Score {
  id: string
  round_id: string
  pillar: string
  skill_key: string
  level: Level
  scored_at: string
}

export async function upsertScore(
  roundId: string,
  pillar: string,
  skillKey: string,
  level: Level
): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase.from('scores').upsert(
    {
      round_id: roundId,
      pillar,
      skill_key: skillKey,
      level,
      scored_at: new Date().toISOString(),
    },
    { onConflict: 'round_id,skill_key' }
  )
  if (error) throw error
}

export async function getScoresForRound(roundId: string): Promise<Score[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('scores')
    .select('*')
    .eq('round_id', roundId)
  if (error) throw error
  return (data ?? []) as Score[]
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/db/
git commit -m "feat: add db helpers for assessment rounds and scores"
```

---

## Task 10: SkillCard component

**Files:**
- Create: `components/app/SkillCard.tsx`
- Create: `__tests__/components/app/SkillCard.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SkillCard } from '@/components/app/SkillCard'

const skill = {
  key: 'self-resilience',
  pillar: 'self' as const,
  label: 'Resilience',
  description: 'How consistently you maintain your effectiveness under pressure.',
}

describe('SkillCard', () => {
  it('renders expanded with label, description and level buttons when no level selected', () => {
    render(<SkillCard skill={skill} currentLevel={null} onSelect={vi.fn()} />)
    expect(screen.getByText('Resilience')).toBeTruthy()
    expect(screen.getByText(/maintain your effectiveness/)).toBeTruthy()
    expect(screen.getByText('Proficient')).toBeTruthy()
  })

  it('calls onSelect with the chosen level', () => {
    const onSelect = vi.fn()
    render(<SkillCard skill={skill} currentLevel={null} onSelect={onSelect} />)
    fireEvent.click(screen.getByText('Advanced'))
    expect(onSelect).toHaveBeenCalledWith('self-resilience', 'Advanced')
  })

  it('renders collapsed when a level is already selected', () => {
    render(<SkillCard skill={skill} currentLevel="Advanced" onSelect={vi.fn()} />)
    expect(screen.getByText('Resilience')).toBeTruthy()
    expect(screen.getByText('Advanced')).toBeTruthy()
    // description hidden in collapsed state
    expect(screen.queryByText(/maintain your effectiveness/)).toBeNull()
  })

  it('expands again when collapsed card is clicked', () => {
    render(<SkillCard skill={skill} currentLevel="Advanced" onSelect={vi.fn()} />)
    fireEvent.click(screen.getByText('Resilience'))
    expect(screen.getByText(/maintain your effectiveness/)).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run test — verify it fails**

```bash
npx vitest run __tests__/components/app/SkillCard.test.tsx
```

Expected: FAIL — module not found

- [ ] **Step 3: Create SkillCard component**

```tsx
'use client'
import { useState } from 'react'
import type { Skill, Level } from '@/lib/skills'
import { LEVELS, LEVEL_COLORS } from '@/lib/skills'

interface Props {
  skill: Skill
  currentLevel: Level | null
  onSelect: (skillKey: string, level: Level) => void
}

export function SkillCard({ skill, currentLevel, onSelect }: Props) {
  const [expanded, setExpanded] = useState(currentLevel === null)

  function handleSelect(level: Level) {
    onSelect(skill.key, level)
    setExpanded(false)
  }

  if (!expanded && currentLevel !== null) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="flex w-full items-center gap-3 rounded-lg bg-slate-800 px-4 py-3 text-left transition-colors hover:bg-slate-700"
      >
        <span className="flex-1 text-sm font-medium text-white">{skill.label}</span>
        <span
          className="rounded-full px-3 py-1 text-xs font-semibold"
          style={{
            color: LEVEL_COLORS[currentLevel],
            background: `${LEVEL_COLORS[currentLevel]}22`,
          }}
        >
          {currentLevel}
        </span>
        <span className="text-xs text-slate-500">✎</span>
      </button>
    )
  }

  return (
    <div
      className="rounded-lg border px-4 py-4"
      style={{
        background: '#1e3a5f',
        borderColor: 'rgba(245,158,11,0.2)',
      }}
    >
      <p className="mb-1 text-sm font-semibold text-white">{skill.label}</p>
      <p className="mb-4 text-xs leading-relaxed text-slate-400">{skill.description}</p>
      <div className="flex flex-wrap gap-2">
        {LEVELS.map(level => (
          <button
            key={level}
            onClick={() => handleSelect(level)}
            className="rounded-full px-3 py-1 text-xs font-semibold transition-opacity hover:opacity-80"
            style={{
              color: LEVEL_COLORS[level],
              background: `${LEVEL_COLORS[level]}22`,
            }}
          >
            {level}
          </button>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run test — verify it passes**

```bash
npx vitest run __tests__/components/app/SkillCard.test.tsx
```

Expected: 4 tests PASS

- [ ] **Step 5: Commit**

```bash
git add components/app/SkillCard.tsx __tests__/components/app/SkillCard.test.tsx
git commit -m "feat: add SkillCard component with expand/collapse behaviour"
```

---

## Task 11: Pillar scoring page

**Files:**
- Create: `app/(app)/scorecard/[pillar]/actions.ts`
- Create: `components/app/ScoringView.tsx`
- Create: `app/(app)/scorecard/[pillar]/page.tsx`

- [ ] **Step 1: Create server action** (`app/(app)/scorecard/[pillar]/actions.ts`)

```ts
'use server'
import { upsertScore } from '@/lib/db/scores'
import { maybeCompleteRound } from '@/lib/db/rounds'
import type { Level } from '@/lib/skills'

export async function saveScore(
  roundId: string,
  pillar: string,
  skillKey: string,
  level: Level
): Promise<void> {
  await upsertScore(roundId, pillar, skillKey, level)
  await maybeCompleteRound(roundId)
}
```

- [ ] **Step 2: Create ScoringView client component** (`components/app/ScoringView.tsx`)

```tsx
'use client'
import { useState, useTransition } from 'react'
import Link from 'next/link'
import { SkillCard } from '@/components/app/SkillCard'
import type { Skill, Level } from '@/lib/skills'
import { saveScore } from '@/app/(app)/scorecard/[pillar]/actions'

interface Props {
  roundId: string
  pillar: string
  pillarLabel: string
  skills: Skill[]
  initialScores: Record<string, Level>
}

export function ScoringView({ roundId, pillar, pillarLabel, skills, initialScores }: Props) {
  const [scores, setScores] = useState<Record<string, Level>>(initialScores)
  const [, startTransition] = useTransition()

  function handleSelect(skillKey: string, level: Level) {
    setScores(prev => ({ ...prev, [skillKey]: level }))
    startTransition(() => {
      saveScore(roundId, pillar, skillKey, level)
    })
  }

  const scored = skills.filter(s => scores[s.key]).length
  const complete = scored === skills.length

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/scorecard" className="text-sm text-slate-400 hover:text-white">
          ← Pillars
        </Link>
        <h1 className="text-xl font-bold text-white">{pillarLabel}</h1>
      </div>

      {/* Progress bar */}
      <div className="mb-6 flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-800">
          <div
            className="h-full rounded-full bg-amber-500 transition-all"
            style={{ width: `${(scored / skills.length) * 100}%` }}
          />
        </div>
        <span className="text-xs text-slate-500">
          {scored} / {skills.length}
        </span>
      </div>

      <div className="flex flex-col gap-3">
        {skills.map(skill => (
          <SkillCard
            key={skill.key}
            skill={skill}
            currentLevel={scores[skill.key] ?? null}
            onSelect={handleSelect}
          />
        ))}
      </div>

      {complete && (
        <div className="mt-8 text-center">
          <Link
            href="/scorecard"
            className="inline-block rounded-lg bg-amber-500 px-6 py-3 text-sm font-semibold text-white hover:bg-amber-400"
          >
            Done — back to pillars
          </Link>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Create page shell** (`app/(app)/scorecard/[pillar]/page.tsx`)

```tsx
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getOrCreateActiveRound } from '@/lib/db/rounds'
import { getScoresForRound } from '@/lib/db/scores'
import { PILLARS, PILLAR_LABELS, getSkillsByPillar, type Pillar, type Level } from '@/lib/skills'
import { ScoringView } from '@/components/app/ScoringView'

export default async function PillarPage({
  params,
}: {
  params: Promise<{ pillar: string }>
}) {
  const { pillar } = await params

  if (!PILLARS.includes(pillar as Pillar)) notFound()

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const round = await getOrCreateActiveRound(user.id)
  const scores = await getScoresForRound(round.id)
  const skills = getSkillsByPillar(pillar as Pillar)

  const initialScores: Record<string, Level> = {}
  scores
    .filter(s => s.pillar === pillar)
    .forEach(s => {
      initialScores[s.skill_key] = s.level
    })

  return (
    <div className="dark min-h-screen" style={{ background: '#0f172a' }}>
      <ScoringView
        roundId={round.id}
        pillar={pillar}
        pillarLabel={PILLAR_LABELS[pillar as Pillar]}
        skills={skills}
        initialScores={initialScores}
      />
    </div>
  )
}
```

- [ ] **Step 4: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add app/\(app\)/scorecard/ components/app/ScoringView.tsx
git commit -m "feat: add pillar scoring page with instant save on level select"
```

---

## Task 12: Scorecard home (pillar picker)

**Files:**
- Create: `app/(app)/scorecard/page.tsx`

- [ ] **Step 1: Create page**

```tsx
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getOrCreateActiveRound, getLatestCompleteRound } from '@/lib/db/rounds'
import { getScoresForRound } from '@/lib/db/scores'
import { PILLARS, PILLAR_LABELS, getSkillsByPillar, LEVEL_VALUES, type Pillar, type Level } from '@/lib/skills'

function pillarAvg(scores: { level: Level }[]): number {
  if (scores.length === 0) return 0
  return scores.reduce((sum, s) => sum + LEVEL_VALUES[s.level], 0) / scores.length
}

export default async function ScorecardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const round = await getOrCreateActiveRound(user.id)
  const scores = await getScoresForRound(round.id)
  const hasCompleteRound = !!(await getLatestCompleteRound(user.id))

  return (
    <div className="dark min-h-screen" style={{ background: '#0f172a' }}>
      <div className="mx-auto max-w-2xl px-4 py-12">
        <h1 className="mb-2 text-2xl font-bold text-white">Your Scorecard</h1>
        <p className="mb-8 text-sm text-slate-400">
          Score yourself on each pillar. Scores save automatically.
        </p>

        <div className="flex flex-col gap-3">
          {PILLARS.map(pillar => {
            const pillarSkills = getSkillsByPillar(pillar as Pillar)
            const pillarScores = scores.filter(s => s.pillar === pillar)
            const scored = pillarScores.length
            const total = pillarSkills.length
            const complete = scored === total
            const avg = complete ? pillarAvg(pillarScores as { level: Level }[]) : null

            return (
              <Link
                key={pillar}
                href={`/scorecard/${pillar}`}
                className="flex items-center gap-4 rounded-xl px-5 py-4 transition-colors"
                style={{ background: '#1e293b' }}
              >
                <span className="flex-1 font-medium text-white">
                  {PILLAR_LABELS[pillar as Pillar]}
                </span>
                {scored > 0 && !complete && (
                  <span className="text-xs text-slate-500">
                    {scored}/{total}
                  </span>
                )}
                {complete && avg !== null && (
                  <span
                    className="rounded-full px-3 py-1 text-xs font-semibold"
                    style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}
                  >
                    {avg.toFixed(1)}
                  </span>
                )}
                <span className="text-slate-600">›</span>
              </Link>
            )
          })}
        </div>

        {hasCompleteRound && (
          <div className="mt-8 text-center">
            <Link
              href="/results"
              className="text-sm font-semibold text-amber-400 hover:text-amber-300"
            >
              View results →
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add app/\(app\)/scorecard/page.tsx
git commit -m "feat: add pillar picker scorecard home page"
```

---

## Task 13: DB helpers — connections and manager scores

**Files:**
- Create: `lib/db/connections.ts`
- Create: `lib/db/manager-scores.ts`

- [ ] **Step 1: Create lib/db/connections.ts**

```ts
import { createClient } from '@/lib/supabase/server'

export interface Connection {
  id: string
  manager_id: string
  direct_report_id: string
  status: 'pending' | 'active'
  initiated_by: string
  created_at: string
}

export async function getConnectionsForUser(userId: string): Promise<{
  asManager: Connection[]
  asDirectReport: Connection[]
}> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('connections')
    .select('*, manager:profiles!connections_manager_id_fkey(id,email,display_name), direct_report:profiles!connections_direct_report_id_fkey(id,email,display_name)')
    .or(`manager_id.eq.${userId},direct_report_id.eq.${userId}`)

  const rows = (data ?? []) as (Connection & {
    manager: { id: string; email: string; display_name: string }
    direct_report: { id: string; email: string; display_name: string }
  })[]

  return {
    asManager: rows.filter(r => r.manager_id === userId),
    asDirectReport: rows.filter(r => r.direct_report_id === userId),
  }
}

export async function createConnection(params: {
  initiatorId: string
  otherEmail: string
  initiatorRole: 'manager' | 'direct_report'
}): Promise<{ error?: string }> {
  const supabase = await createClient()

  // Look up other user by email
  const { data: otherProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', params.otherEmail)
    .maybeSingle()

  if (!otherProfile) {
    return { error: 'No account found for that email. Ask them to sign up first.' }
  }

  const managerId =
    params.initiatorRole === 'manager' ? params.initiatorId : otherProfile.id
  const directReportId =
    params.initiatorRole === 'direct_report' ? params.initiatorId : otherProfile.id

  const { error } = await supabase.from('connections').insert({
    manager_id: managerId,
    direct_report_id: directReportId,
    status: 'pending',
    initiated_by: params.initiatorId,
  })

  if (error) {
    if (error.code === '23505') return { error: 'Connection already exists.' }
    return { error: error.message }
  }

  return {}
}

export async function acceptConnection(connectionId: string): Promise<void> {
  const supabase = await createClient()
  await supabase
    .from('connections')
    .update({ status: 'active' })
    .eq('id', connectionId)
}
```

- [ ] **Step 2: Create lib/db/manager-scores.ts**

```ts
import { createClient } from '@/lib/supabase/server'
import type { Level } from '@/lib/skills'

export interface ManagerScore {
  id: string
  round_id: string
  manager_id: string
  skill_key: string
  level: Level
  scored_at: string
}

export async function upsertManagerScore(
  roundId: string,
  managerId: string,
  skillKey: string,
  level: Level
): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase.from('manager_scores').upsert(
    {
      round_id: roundId,
      manager_id: managerId,
      skill_key: skillKey,
      level,
      scored_at: new Date().toISOString(),
    },
    { onConflict: 'round_id,manager_id,skill_key' }
  )
  if (error) throw error
}

export async function getManagerScoresForRound(
  roundId: string,
  managerId: string
): Promise<ManagerScore[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('manager_scores')
    .select('*')
    .eq('round_id', roundId)
    .eq('manager_id', managerId)
  if (error) throw error
  return (data ?? []) as ManagerScore[]
}

export async function getManagerScoresForDirectReport(
  roundId: string
): Promise<ManagerScore[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('manager_scores')
    .select('*')
    .eq('round_id', roundId)
  if (error) throw error
  return (data ?? []) as ManagerScore[]
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/db/connections.ts lib/db/manager-scores.ts
git commit -m "feat: add db helpers for connections and manager scores"
```

---

## Task 14: Connections page

**Files:**
- Create: `app/(app)/connections/actions.ts`
- Create: `app/(app)/connections/page.tsx`

- [ ] **Step 1: Create server action** (`app/(app)/connections/actions.ts`)

```ts
'use server'
import { createClient } from '@/lib/supabase/server'
import { createConnection, acceptConnection } from '@/lib/db/connections'

export async function inviteConnection(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const email = formData.get('email') as string
  const role = formData.get('role') as 'manager' | 'direct_report'

  return createConnection({
    initiatorId: user.id,
    otherEmail: email,
    initiatorRole: role,
  })
}

export async function acceptConnectionAction(connectionId: string) {
  await acceptConnection(connectionId)
}
```

- [ ] **Step 2: Create connections page** (`app/(app)/connections/page.tsx`)

```tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getConnectionsForUser } from '@/lib/db/connections'
import { inviteConnection, acceptConnectionAction } from './actions'

export default async function ConnectionsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { asManager, asDirectReport } = await getConnectionsForUser(user.id)
  const pendingIncoming = asDirectReport.filter(c => c.status === 'pending' && c.initiated_by !== user.id)

  return (
    <div className="dark min-h-screen" style={{ background: '#0f172a' }}>
      <div className="mx-auto max-w-2xl px-4 py-12">
        <h1 className="mb-8 text-2xl font-bold text-white">Connections</h1>

        {/* Pending invites to accept */}
        {pendingIncoming.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-amber-400">
              Pending invites
            </h2>
            {pendingIncoming.map(c => (
              <div key={c.id} className="mb-2 flex items-center gap-4 rounded-lg bg-slate-800 px-4 py-3">
                <span className="flex-1 text-sm text-white">
                  {(c as any).manager?.email ?? 'someone'} wants to connect as your manager
                </span>
                <form action={acceptConnectionAction.bind(null, c.id)}>
                  <button className="rounded bg-amber-500 px-3 py-1 text-xs font-semibold text-white">
                    Accept
                  </button>
                </form>
              </div>
            ))}
          </section>
        )}

        {/* My direct reports */}
        {asManager.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">
              Your direct reports
            </h2>
            {asManager.map(c => (
              <div key={c.id} className="mb-2 flex items-center gap-3 rounded-lg bg-slate-800 px-4 py-3">
                <span className="flex-1 text-sm text-white">{(c as any).direct_report?.email}</span>
                <span
                  className="text-xs"
                  style={{ color: c.status === 'active' ? '#4ade80' : '#f59e0b' }}
                >
                  {c.status}
                </span>
              </div>
            ))}
          </section>
        )}

        {/* My managers */}
        {asDirectReport.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">
              Your manager
            </h2>
            {asDirectReport.map(c => (
              <div key={c.id} className="mb-2 flex items-center gap-3 rounded-lg bg-slate-800 px-4 py-3">
                <span className="flex-1 text-sm text-white">{(c as any).manager?.email}</span>
                <span
                  className="text-xs"
                  style={{ color: c.status === 'active' ? '#4ade80' : '#f59e0b' }}
                >
                  {c.status}
                </span>
              </div>
            ))}
          </section>
        )}

        {/* Invite form */}
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">
            Add a connection
          </h2>
          <form action={inviteConnection} className="flex flex-col gap-3">
            <input
              name="email"
              type="email"
              placeholder="their@email.com"
              required
              className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
            />
            <div className="flex gap-3">
              <label className="flex flex-1 cursor-pointer items-center gap-2 rounded-lg border border-slate-700 px-4 py-3 text-sm text-white has-[:checked]:border-amber-400">
                <input type="radio" name="role" value="manager" required className="accent-amber-400" />
                They are my manager
              </label>
              <label className="flex flex-1 cursor-pointer items-center gap-2 rounded-lg border border-slate-700 px-4 py-3 text-sm text-white has-[:checked]:border-amber-400">
                <input type="radio" name="role" value="direct_report" required className="accent-amber-400" />
                They report to me
              </label>
            </div>
            <button
              type="submit"
              className="rounded-lg bg-amber-500 px-4 py-3 text-sm font-semibold text-white hover:bg-amber-400"
            >
              Send invite
            </button>
          </form>
        </section>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add app/\(app\)/connections/
git commit -m "feat: add connections page with invite form and accept flow"
```

---

## Task 15: Manager scoring page

**Files:**
- Create: `app/(app)/manager/[userId]/actions.ts`
- Create: `app/(app)/manager/[userId]/page.tsx`

- [ ] **Step 1: Create server action** (`app/(app)/manager/[userId]/actions.ts`)

```ts
'use server'
import { createClient } from '@/lib/supabase/server'
import { upsertManagerScore } from '@/lib/db/manager-scores'
import type { Level } from '@/lib/skills'

export async function saveManagerScore(
  roundId: string,
  pillar: string,
  skillKey: string,
  level: Level
): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  await upsertManagerScore(roundId, user.id, skillKey, level)
}
```

- [ ] **Step 2: Create manager scoring page** (`app/(app)/manager/[userId]/page.tsx`)

This page reuses the `ScoringView` pattern but passes `saveManagerScore` as the action.
Since `ScoringView` imports `saveScore` directly, create a wrapper component:

Create `components/app/ManagerScoringView.tsx`:

```tsx
'use client'
import { useState, useTransition } from 'react'
import Link from 'next/link'
import { SkillCard } from '@/components/app/SkillCard'
import type { Skill, Level } from '@/lib/skills'
import { saveManagerScore } from '@/app/(app)/manager/[userId]/actions'

interface Props {
  roundId: string
  pillar: string
  pillarLabel: string
  skills: Skill[]
  initialScores: Record<string, Level>
  directReportName: string
}

export function ManagerScoringView({
  roundId,
  pillar,
  pillarLabel,
  skills,
  initialScores,
  directReportName,
}: Props) {
  const [scores, setScores] = useState<Record<string, Level>>(initialScores)
  const [, startTransition] = useTransition()

  function handleSelect(skillKey: string, level: Level) {
    setScores(prev => ({ ...prev, [skillKey]: level }))
    startTransition(() => {
      saveManagerScore(roundId, pillar, skillKey, level)
    })
  }

  const scored = skills.filter(s => scores[s.key]).length

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-4 flex items-center gap-3">
        <Link href={`/manager/${roundId}`} className="text-sm text-slate-400 hover:text-white">
          ← Back
        </Link>
        <div>
          <h1 className="text-xl font-bold text-white">Scoring {directReportName}</h1>
          <p className="text-sm text-slate-400">{pillarLabel}</p>
        </div>
      </div>

      <div className="mb-6 flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-800">
          <div
            className="h-full rounded-full bg-blue-500 transition-all"
            style={{ width: `${(scored / skills.length) * 100}%` }}
          />
        </div>
        <span className="text-xs text-slate-500">{scored} / {skills.length}</span>
      </div>

      <div className="flex flex-col gap-3">
        {skills.map(skill => (
          <SkillCard
            key={skill.key}
            skill={skill}
            currentLevel={scores[skill.key] ?? null}
            onSelect={handleSelect}
          />
        ))}
      </div>
    </div>
  )
}
```

Now the page (`app/(app)/manager/[userId]/page.tsx`):

```tsx
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getLatestCompleteRound } from '@/lib/db/rounds'
import { getManagerScoresForRound } from '@/lib/db/manager-scores'
import { PILLARS, PILLAR_LABELS, getSkillsByPillar, type Pillar, type Level } from '@/lib/skills'
import Link from 'next/link'
import { ManagerScoringView } from '@/components/app/ManagerScoringView'

export default async function ManagerPage({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string }>
  searchParams: Promise<{ pillar?: string }>
}) {
  const { userId } = await params
  const { pillar } = await searchParams

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Verify active connection exists
  const { data: connection } = await supabase
    .from('connections')
    .select('*')
    .eq('manager_id', user.id)
    .eq('direct_report_id', userId)
    .eq('status', 'active')
    .maybeSingle()
  if (!connection) notFound()

  // Get direct report profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, email')
    .eq('id', userId)
    .single()

  // Get their latest complete round
  const round = await getLatestCompleteRound(userId)
  if (!round) {
    return (
      <div className="dark min-h-screen flex items-center justify-center" style={{ background: '#0f172a' }}>
        <p className="text-slate-400">
          {profile?.display_name ?? 'This person'} hasn't completed a self-assessment round yet.
        </p>
      </div>
    )
  }

  // Pillar picker if no pillar param
  if (!pillar || !PILLARS.includes(pillar as Pillar)) {
    const managerScores = await getManagerScoresForRound(round.id, user.id)
    const scoredPillars = new Set(
      PILLARS.filter(p =>
        getSkillsByPillar(p as Pillar).every(s => managerScores.some(ms => ms.skill_key === s.key))
      )
    )

    return (
      <div className="dark min-h-screen" style={{ background: '#0f172a' }}>
        <div className="mx-auto max-w-2xl px-4 py-12">
          <h1 className="mb-2 text-2xl font-bold text-white">
            Scoring {profile?.display_name ?? profile?.email}
          </h1>
          <p className="mb-8 text-sm text-slate-400">Select a pillar to score.</p>
          <div className="flex flex-col gap-3">
            {PILLARS.map(p => (
              <Link
                key={p}
                href={`/manager/${userId}?pillar=${p}`}
                className="flex items-center gap-4 rounded-xl bg-slate-800 px-5 py-4"
              >
                <span className="flex-1 font-medium text-white">{PILLAR_LABELS[p as Pillar]}</span>
                {scoredPillars.has(p) && (
                  <span className="text-xs text-green-400">✓ scored</span>
                )}
                <span className="text-slate-600">›</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const skills = getSkillsByPillar(pillar as Pillar)
  const managerScores = await getManagerScoresForRound(round.id, user.id)
  const initialScores: Record<string, Level> = {}
  managerScores
    .filter(ms => skills.some(s => s.key === ms.skill_key))
    .forEach(ms => {
      initialScores[ms.skill_key] = ms.level
    })

  return (
    <div className="dark min-h-screen" style={{ background: '#0f172a' }}>
      <ManagerScoringView
        roundId={round.id}
        pillar={pillar}
        pillarLabel={PILLAR_LABELS[pillar as Pillar]}
        skills={skills}
        initialScores={initialScores}
        directReportName={profile?.display_name ?? profile?.email ?? 'your direct report'}
      />
    </div>
  )
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add app/\(app\)/manager/ components/app/ManagerScoringView.tsx
git commit -m "feat: add manager scoring page"
```

---

## Task 16: Radar chart component

**Files:**
- Create: `components/app/ScorecardRadarChart.tsx`

- [ ] **Step 1: Create component**

```tsx
'use client'
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { PILLAR_LABELS, type Pillar } from '@/lib/skills'

interface PillarScore {
  pillar: Pillar
  selfScore: number
  managerScore?: number
}

interface Props {
  pillarScores: PillarScore[]
  showManager: boolean
}

export function ScorecardRadarChart({ pillarScores, showManager }: Props) {
  const data = pillarScores.map(ps => ({
    pillar: PILLAR_LABELS[ps.pillar],
    Self: Number(ps.selfScore.toFixed(2)),
    Manager: ps.managerScore !== undefined ? Number(ps.managerScore.toFixed(2)) : undefined,
  }))

  return (
    <ResponsiveContainer width="100%" height={280}>
      <RadarChart data={data} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
        <PolarGrid stroke="#1e293b" />
        <PolarAngleAxis
          dataKey="pillar"
          tick={{ fill: '#94a3b8', fontSize: 11 }}
        />
        <Radar
          name="Self"
          dataKey="Self"
          stroke="#f59e0b"
          fill="#f59e0b"
          fillOpacity={0.18}
          strokeWidth={2}
        />
        {showManager && (
          <Radar
            name="Manager"
            dataKey="Manager"
            stroke="#3b82f6"
            fill="#3b82f6"
            fillOpacity={0.12}
            strokeWidth={1.5}
            strokeDasharray="4 2"
          />
        )}
        {showManager && (
          <Legend
            wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }}
          />
        )}
      </RadarChart>
    </ResponsiveContainer>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/app/ScorecardRadarChart.tsx
git commit -m "feat: add radar chart component using recharts"
```

---

## Task 17: Skill bar chart component

**Files:**
- Create: `components/app/SkillBarChart.tsx`

- [ ] **Step 1: Create component**

```tsx
'use client'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { LEVEL_VALUES, type Level } from '@/lib/skills'

interface SkillData {
  label: string
  selfLevel: Level
  managerLevel?: Level
}

interface Props {
  skills: SkillData[]
  showManager: boolean
}

export function SkillBarChart({ skills, showManager }: Props) {
  const data = skills.map(s => ({
    name: s.label,
    Self: LEVEL_VALUES[s.selfLevel],
    Manager: s.managerLevel !== undefined ? LEVEL_VALUES[s.managerLevel] : undefined,
  }))

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart
        data={data}
        margin={{ top: 0, right: 0, bottom: 50, left: -10 }}
      >
        <XAxis
          dataKey="name"
          angle={-35}
          textAnchor="end"
          interval={0}
          tick={{ fontSize: 9, fill: '#64748b' }}
        />
        <YAxis domain={[0, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fontSize: 9, fill: '#64748b' }} />
        <Tooltip
          contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '6px', fontSize: '11px' }}
        />
        {showManager && (
          <Legend wrapperStyle={{ fontSize: '10px', color: '#94a3b8', paddingTop: '8px' }} />
        )}
        <Bar dataKey="Self" fill="#f59e0b" radius={[2, 2, 0, 0]} maxBarSize={12} />
        {showManager && (
          <Bar dataKey="Manager" fill="#3b82f6" radius={[2, 2, 0, 0]} maxBarSize={12} />
        )}
      </BarChart>
    </ResponsiveContainer>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/app/SkillBarChart.tsx
git commit -m "feat: add grouped bar chart component for per-skill scores"
```

---

## Task 18: Results page

**Files:**
- Create: `components/app/ResultsPillarList.tsx`
- Create: `app/(app)/results/page.tsx`

- [ ] **Step 1: Create ResultsPillarList** (`components/app/ResultsPillarList.tsx`)

```tsx
'use client'
import { useState } from 'react'
import { SkillBarChart } from '@/components/app/SkillBarChart'
import type { Pillar, Level } from '@/lib/skills'
import { PILLAR_LABELS, LEVEL_VALUES } from '@/lib/skills'

interface SkillResult {
  skillKey: string
  label: string
  selfLevel: Level
  managerLevel?: Level
}

interface PillarResult {
  pillar: Pillar
  skills: SkillResult[]
}

interface Props {
  pillars: PillarResult[]
  showManager: boolean
}

function scoreColor(avg: number): string {
  if (avg >= 4) return '#4ade80'
  if (avg >= 3) return '#a3e635'
  if (avg >= 2) return '#f59e0b'
  return '#f87171'
}

export function ResultsPillarList({ pillars, showManager }: Props) {
  const [expandedPillar, setExpandedPillar] = useState<Pillar | null>(null)

  return (
    <div className="flex flex-col gap-3">
      {pillars.map(({ pillar, skills }) => {
        const avg =
          skills.reduce((sum, s) => sum + LEVEL_VALUES[s.selfLevel], 0) / skills.length
        const isExpanded = expandedPillar === pillar

        return (
          <div
            key={pillar}
            className="overflow-hidden rounded-xl"
            style={{ background: '#1e293b' }}
          >
            <button
              onClick={() => setExpandedPillar(isExpanded ? null : pillar)}
              className="flex w-full items-center gap-4 px-4 py-3"
            >
              <span className="flex-1 text-left font-medium text-white">
                {PILLAR_LABELS[pillar]}
              </span>
              <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-700">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(avg / 5) * 100}%`,
                    background: scoreColor(avg),
                  }}
                />
              </div>
              <span
                className="w-8 text-right text-xs font-semibold"
                style={{ color: scoreColor(avg) }}
              >
                {avg.toFixed(1)}
              </span>
              <span className="text-slate-500 text-xs">{isExpanded ? '▾' : '▸'}</span>
            </button>

            {isExpanded && (
              <div className="border-t border-slate-700/50 px-4 pb-4 pt-3">
                <SkillBarChart
                  skills={skills.map(s => ({
                    label: s.label,
                    selfLevel: s.selfLevel,
                    managerLevel: showManager ? s.managerLevel : undefined,
                  }))}
                  showManager={showManager && skills.some(s => s.managerLevel)}
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Create results page** (`app/(app)/results/page.tsx`)

```tsx
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getLatestCompleteRound } from '@/lib/db/rounds'
import { getScoresForRound } from '@/lib/db/scores'
import { getManagerScoresForDirectReport } from '@/lib/db/manager-scores'
import {
  PILLARS,
  PILLAR_LABELS,
  getSkillsByPillar,
  LEVEL_VALUES,
  type Pillar,
  type Level,
} from '@/lib/skills'
import { ScorecardRadarChart } from '@/components/app/ScorecardRadarChart'
import { ResultsPillarList } from '@/components/app/ResultsPillarList'

export default async function ResultsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const round = await getLatestCompleteRound(user.id)
  if (!round) redirect('/scorecard')

  const scores = await getScoresForRound(round.id)
  const managerScores = await getManagerScoresForDirectReport(round.id)
  const hasManagerScores = managerScores.length > 0

  const pillarScores = PILLARS.map(pillar => {
    const pillarSkills = getSkillsByPillar(pillar as Pillar)
    const selfScores = scores.filter(s => s.pillar === pillar)
    const selfAvg =
      selfScores.reduce((sum, s) => sum + LEVEL_VALUES[s.level as Level], 0) /
      (selfScores.length || 1)

    const managerPillarScores = managerScores.filter(ms =>
      pillarSkills.some(s => s.key === ms.skill_key)
    )
    const managerAvg = managerPillarScores.length
      ? managerPillarScores.reduce((sum, ms) => sum + LEVEL_VALUES[ms.level as Level], 0) /
        managerPillarScores.length
      : undefined

    return {
      pillar: pillar as Pillar,
      selfScore: selfAvg,
      managerScore: managerAvg,
      skills: pillarSkills.map(skill => {
        const selfScore = selfScores.find(s => s.skill_key === skill.key)
        const managerScore = managerScores.find(ms => ms.skill_key === skill.key)
        return {
          skillKey: skill.key,
          label: skill.label,
          selfLevel: (selfScore?.level ?? 'Basic') as Level,
          managerLevel: managerScore ? (managerScore.level as Level) : undefined,
        }
      }),
    }
  })

  return (
    <div className="dark min-h-screen" style={{ background: '#0f172a' }}>
      <div className="mx-auto max-w-2xl px-4 py-12">
        <div className="mb-6 flex items-center gap-4">
          <h1 className="flex-1 text-2xl font-bold text-white">Your Results</h1>
          <Link href="/scorecard" className="text-sm text-slate-400 hover:text-white">
            Retake →
          </Link>
        </div>

        {/* Radar chart — client component handles toggles */}
        <ResultsView
          pillarScores={pillarScores}
          hasManagerScores={hasManagerScores}
        />

        {/* Invite CTA if no manager scores */}
        {!hasManagerScores && (
          <div
            className="mt-6 flex items-center justify-between rounded-xl px-5 py-4"
            style={{
              background: '#1e3a5f',
              border: '1px solid rgba(245,158,11,0.2)',
            }}
          >
            <div>
              <p className="text-sm font-semibold text-white">Invite your manager</p>
              <p className="text-xs text-slate-400">
                They score you independently, then you compare
              </p>
            </div>
            <Link
              href="/connections"
              className="text-sm font-semibold text-amber-400 hover:text-amber-300"
            >
              Connect →
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
```

The `ResultsPage` passes data to a client component for toggles. Create `components/app/ResultsView.tsx`:

```tsx
'use client'
import { useState } from 'react'
import { ScorecardRadarChart } from '@/components/app/ScorecardRadarChart'
import { ResultsPillarList } from '@/components/app/ResultsPillarList'
import type { Pillar, Level } from '@/lib/skills'

interface PillarScore {
  pillar: Pillar
  selfScore: number
  managerScore?: number
  skills: {
    skillKey: string
    label: string
    selfLevel: Level
    managerLevel?: Level
  }[]
}

interface Props {
  pillarScores: PillarScore[]
  hasManagerScores: boolean
}

export function ResultsView({ pillarScores, hasManagerScores }: Props) {
  const [showManager, setShowManager] = useState(false)

  return (
    <>
      {/* Toggles — only shown if manager scores exist */}
      {hasManagerScores && (
        <div className="mb-4 flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Show:
          </span>
          <span
            className="rounded-full px-3 py-1 text-xs font-bold"
            style={{ background: '#f59e0b', color: '#1a3a5c' }}
          >
            Self
          </span>
          <button
            onClick={() => setShowManager(m => !m)}
            className="rounded-full border px-3 py-1 text-xs font-semibold transition-colors"
            style={{
              background: showManager ? '#1e3a5f' : 'transparent',
              borderColor: showManager ? '#3b82f6' : '#334155',
              color: showManager ? '#93c5fd' : '#475569',
            }}
          >
            Manager
          </button>
        </div>
      )}

      <div className="mb-6">
        <ScorecardRadarChart
          pillarScores={pillarScores}
          showManager={hasManagerScores && showManager}
        />
      </div>

      <ResultsPillarList
        pillars={pillarScores}
        showManager={hasManagerScores && showManager}
      />
    </>
  )
}
```

Update `app/(app)/results/page.tsx` to import `ResultsView` instead of using both chart and list inline — replace the `<ResultsView ... />` placeholder (already written above) and add the import:

```tsx
import { ResultsView } from '@/components/app/ResultsView'
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add app/\(app\)/results/ components/app/ResultsPillarList.tsx components/app/ResultsView.tsx
git commit -m "feat: add results page with radar chart and pillar drill-down"
```

---

## Task 19: Update the-tool page with beta CTA

**Files:**
- Modify: `app/the-tool/page.tsx`

- [ ] **Step 1: Add beta CTA to the v2 coming section**

In `app/the-tool/page.tsx`, find the closing `</ul>` of the V2_FEATURES list and add a beta link below it:

```tsx
          </ul>
          <div className="mt-6 flex items-center gap-4">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-md border px-5 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90"
              style={{ borderColor: 'rgba(245,158,11,0.5)', color: '#f59e0b' }}
            >
              Try the new app (beta) →
            </Link>
            <span className="text-xs" style={{ color: 'rgba(254,252,247,0.30)' }}>
              Request access to join the waitlist
            </span>
          </div>
```

- [ ] **Step 2: Run full test suite**

```bash
npx vitest run
```

Expected: all tests PASS (skills + SkillCard + existing tests)

- [ ] **Step 3: Commit**

```bash
git add app/the-tool/page.tsx
git commit -m "feat: add beta app CTA to the-tool marketing page"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Task |
|---|---|
| Magic link auth | Task 7–8 |
| Beta allowlist via APP_BETA_EMAILS | Tasks 5–6 |
| profiles + assessment_rounds + scores + manager_scores + connections tables | Task 2 |
| RLS on all tables | Task 2 |
| lib/skills.ts with stable keys + descriptions | Task 4 |
| Pillar picker showing 5 pillars with status/score | Task 12 |
| Score saves immediately, card collapses | Tasks 10–11 |
| Round marked complete when all pillars scored | Task 9 (maybeCompleteRound) |
| Results: radar chart, self/manager toggle | Tasks 16, 18 |
| Results: pillar drill-down with per-skill bar chart | Tasks 17–18 |
| /results redirects to /scorecard if no complete round | Task 18 |
| Manager/org toggle hidden for solo users | Task 18 (ResultsView) |
| Connections: either party can initiate | Task 14 |
| Connections: pending → active on accept | Task 14 |
| Manager scoring: writes to manager_scores | Task 15 |
| the-tool: beta CTA → /login | Task 19 |

**Placeholder scan:** None found.

**Type consistency:** `Level`, `Pillar`, `Skill` defined once in `lib/skills.ts` and imported everywhere. `Score` and `Round` interfaces defined in `lib/db/` files and used consistently.

**Gap:** The spec mentions in-app notification "Direct report is notified (in-app, next login) that their manager has submitted scores." This is not implemented in Phase 1 — it requires a notifications table or reading manager_scores count change. Left for Phase 2 to keep scope tight.

---

**Plan complete and saved to `docs/superpowers/plans/2026-05-16-scorecard-app.md`.**

**Two execution options:**

**1. Subagent-Driven (recommended)** — fresh subagent per task, spec + quality review between tasks, continuous execution

**2. Inline Execution** — execute tasks in this session using executing-plans, with checkpoints for review

**Which approach?**
