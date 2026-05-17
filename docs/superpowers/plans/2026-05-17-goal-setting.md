# Goal Setting & Resource Library Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full-featured goal management system — redesigned Growth page, DB-driven resource library, rich goal creation/detail flow with evidence tracking, check-in scheduling, and a completion celebration overlay.

**Architecture:** Four new Supabase tables (`resources`, `skill_resources`, `goal_resources`, `goal_evidence`) extend the existing `development_plans` table (adds `checkin_frequency_weeks`, `last_checkin_at`). The Growth page is fully rewritten with focused server/client components. Goal detail lives at `/growth/goal/[id]`. The public Resources page switches from a hardcoded constant to DB-driven. All mutations go through server actions in `app/(app)/growth/actions.ts`.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Supabase (PostgreSQL + RLS), Tailwind CSS v4, Vitest + Testing Library, `lottie-react` (new), `@anthropic-ai/sdk` (seeding script only, not installed in app)

---

## File Map

**New files:**
- `supabase/migrations/004_resources.sql`
- `supabase/migrations/005_goal_tables.sql`
- `supabase/migrations/006_development_plans_checkin.sql`
- `lib/db/resources.ts`
- `lib/db/goal-resources.ts`
- `lib/db/goal-evidence.ts`
- `lib/utils/checkin.ts`
- `lib/affirmations.ts`
- `scripts/seed-resources.ts`
- `components/app/ActiveGoalsPanel.tsx`
- `components/app/OpportunitiesPanel.tsx`
- `components/app/SkillsTable.tsx`
- `components/app/ResourceRow.tsx`
- `components/app/ResourcePanel.tsx`
- `components/app/GoalForm.tsx`
- `components/app/ProgressStrip.tsx`
- `components/app/EvidenceLog.tsx`
- `components/app/GoalCompleteOverlay.tsx`
- `components/app/CheckInNudgeCard.tsx`
- `components/app/__tests__/checkin.test.ts`
- `components/app/__tests__/SkillsTable.test.tsx`
- `app/(app)/growth/goal/new/page.tsx`
- `app/(app)/growth/goal/[id]/page.tsx`
- `public/lottie/confetti.json`

**Modified files:**
- `lib/db/development-plans.ts` — add new columns to type + `getPlanById` + update `upsertPlan`
- `app/(app)/growth/actions.ts` — replace `savePlanAction` with full set of new actions
- `app/(app)/growth/page.tsx` — full rewrite using new components
- `app/(app)/dashboard/page.tsx` — add overdue check-in nudge
- `app/resources/page.tsx` — replace hardcoded constant with DB fetch
- `components/app/GrowthView.tsx` — **delete** (replaced by new components)

---

## Task 1: Migration 004 — resources + skill_resources

**Files:**
- Create: `supabase/migrations/004_resources.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- supabase/migrations/004_resources.sql
create table public.resources (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  url           text not null unique,
  description   text not null,
  resource_type text not null check (resource_type in ('book','article','course','video','person','podcast','tool')),
  author        text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.resources enable row level security;

-- Public catalogue: anyone can read, writes only via service role key
create policy "Public can read resources"
  on public.resources for select using (true);

create table public.skill_resources (
  resource_id     uuid not null references public.resources(id) on delete cascade,
  skill_key       text not null,
  relevance_score int  not null default 3 check (relevance_score between 1 and 5),
  primary key (resource_id, skill_key)
);

alter table public.skill_resources enable row level security;

create policy "Public can read skill_resources"
  on public.skill_resources for select using (true);
```

- [ ] **Step 2: Apply the migration**

Open the Supabase SQL editor for your project and run the contents of `004_resources.sql`. Confirm that both tables appear in the Table Editor.

- [ ] **Step 3: Verify RLS**

Run this in the SQL editor:
```sql
select tablename, rowsecurity from pg_tables
where tablename in ('resources', 'skill_resources');
```
Expected: both rows show `rowsecurity = true`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/004_resources.sql
git commit -m "feat: add resources and skill_resources tables"
```

---

## Task 2: Migration 005 — goal_resources + goal_evidence

**Files:**
- Create: `supabase/migrations/005_goal_tables.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- supabase/migrations/005_goal_tables.sql
create table public.goal_resources (
  id          uuid primary key default gen_random_uuid(),
  plan_id     uuid not null references public.development_plans(id) on delete cascade,
  resource_id uuid not null references public.resources(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (plan_id, resource_id)
);

alter table public.goal_resources enable row level security;

create policy "Users manage own goal resources"
  on public.goal_resources for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table public.goal_evidence (
  id           uuid primary key default gen_random_uuid(),
  plan_id      uuid not null references public.development_plans(id) on delete cascade,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  what_you_did text not null,
  impact       text not null,
  url          text,
  created_at   timestamptz not null default now()
);

alter table public.goal_evidence enable row level security;

create policy "Users manage own evidence"
  on public.goal_evidence for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

- [ ] **Step 2: Apply the migration**

Run in the Supabase SQL editor. Confirm both tables appear.

- [ ] **Step 3: Verify foreign keys**

```sql
select conname, conrelid::regclass, confrelid::regclass
from pg_constraint
where contype = 'f'
  and conrelid::regclass::text in ('goal_resources', 'goal_evidence');
```
Expected: rows showing FK references to `development_plans`, `resources`, and `profiles`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/005_goal_tables.sql
git commit -m "feat: add goal_resources and goal_evidence tables"
```

---

## Task 3: Migration 006 — alter development_plans

**Files:**
- Create: `supabase/migrations/006_development_plans_checkin.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- supabase/migrations/006_development_plans_checkin.sql
alter table public.development_plans
  add column if not exists checkin_frequency_weeks int,
  add column if not exists last_checkin_at         timestamptz;
```

- [ ] **Step 2: Apply the migration**

Run in the Supabase SQL editor.

- [ ] **Step 3: Verify columns exist**

```sql
select column_name, data_type
from information_schema.columns
where table_name = 'development_plans'
  and column_name in ('checkin_frequency_weeks', 'last_checkin_at');
```
Expected: two rows.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/006_development_plans_checkin.sql
git commit -m "feat: add checkin_frequency_weeks and last_checkin_at to development_plans"
```

---

## Task 4: Update lib/db/development-plans.ts

**Files:**
- Modify: `lib/db/development-plans.ts`

- [ ] **Step 1: Update the file**

Replace the entire file:

```typescript
import { createClient } from '@/lib/supabase/server'

export interface DevelopmentPlan {
  id: string
  user_id: string
  skill_key: string
  pillar: string
  goal: string
  target_date: string | null
  status: 'planned' | 'in_progress' | 'completed'
  checkin_frequency_weeks: number | null
  last_checkin_at: string | null
  created_at: string
  updated_at: string
}

export async function getPlansForUser(userId: string): Promise<DevelopmentPlan[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('development_plans')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as DevelopmentPlan[]
}

export async function getPlanById(id: string): Promise<DevelopmentPlan | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('development_plans')
    .select('*')
    .eq('id', id)
    .single()
  if (error) return null
  return data as DevelopmentPlan
}

export async function upsertPlan(
  userId: string,
  plan: {
    skill_key: string
    pillar: string
    goal: string
    target_date?: string | null
    status: 'planned' | 'in_progress' | 'completed'
    checkin_frequency_weeks?: number | null
  }
): Promise<DevelopmentPlan> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('development_plans')
    .upsert(
      { user_id: userId, ...plan, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,skill_key' }
    )
    .select()
    .single()
  if (error) throw error
  return data as DevelopmentPlan
}

export async function markPlanComplete(id: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('development_plans')
    .update({ status: 'completed', updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function updateLastCheckin(id: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('development_plans')
    .update({ last_checkin_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors related to `development-plans.ts`.

- [ ] **Step 3: Commit**

```bash
git add lib/db/development-plans.ts
git commit -m "feat: extend DevelopmentPlan type with checkin fields and add getPlanById"
```

---

## Task 5: Create lib/db/resources.ts

**Files:**
- Create: `lib/db/resources.ts`

- [ ] **Step 1: Create the file**

```typescript
import { createClient } from '@/lib/supabase/server'

export interface Resource {
  id: string
  title: string
  url: string
  description: string
  resource_type: 'book' | 'article' | 'course' | 'video' | 'person' | 'podcast' | 'tool'
  author: string | null
  created_at: string
  updated_at: string
}

export async function getResourcesForSkill(skillKey: string): Promise<Resource[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('skill_resources')
    .select('resource_id, relevance_score, resources(*)')
    .eq('skill_key', skillKey)
    .order('relevance_score', { ascending: false })
    .limit(8)
  if (error) throw error
  return (data ?? []).map((row: any) => row.resources as Resource)
}

export async function getAllResources(): Promise<Resource[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('resources')
    .select('*')
    .order('resource_type')
    .order('title')
  if (error) throw error
  return (data ?? []) as Resource[]
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add lib/db/resources.ts
git commit -m "feat: add resources DB helper"
```

---

## Task 6: Create lib/db/goal-resources.ts

**Files:**
- Create: `lib/db/goal-resources.ts`

- [ ] **Step 1: Create the file**

```typescript
import { createClient } from '@/lib/supabase/server'
import type { Resource } from './resources'

export interface GoalResource {
  id: string
  plan_id: string
  resource_id: string
  user_id: string
  created_at: string
  resource: Resource
}

export async function getGoalResources(planId: string): Promise<GoalResource[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('goal_resources')
    .select('*, resource:resources(*)')
    .eq('plan_id', planId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []) as GoalResource[]
}

export async function addGoalResource(
  planId: string,
  resourceId: string,
  userId: string
): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('goal_resources')
    .insert({ plan_id: planId, resource_id: resourceId, user_id: userId })
  if (error && error.code !== '23505') throw error // ignore duplicate
}

export async function removeGoalResource(planId: string, resourceId: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('goal_resources')
    .delete()
    .eq('plan_id', planId)
    .eq('resource_id', resourceId)
  if (error) throw error
}

export async function bulkAddGoalResources(
  planId: string,
  resourceIds: string[],
  userId: string
): Promise<void> {
  if (resourceIds.length === 0) return
  const supabase = await createClient()
  const { error } = await supabase.from('goal_resources').insert(
    resourceIds.map(resource_id => ({ plan_id: planId, resource_id, user_id: userId }))
  )
  if (error && error.code !== '23505') throw error
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add lib/db/goal-resources.ts
git commit -m "feat: add goal-resources DB helper"
```

---

## Task 7: Create lib/db/goal-evidence.ts

**Files:**
- Create: `lib/db/goal-evidence.ts`

- [ ] **Step 1: Create the file**

```typescript
import { createClient } from '@/lib/supabase/server'

export interface GoalEvidence {
  id: string
  plan_id: string
  user_id: string
  what_you_did: string
  impact: string
  url: string | null
  created_at: string
}

export async function getEvidenceForPlan(planId: string): Promise<GoalEvidence[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('goal_evidence')
    .select('*')
    .eq('plan_id', planId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as GoalEvidence[]
}

export async function addEvidence(
  planId: string,
  userId: string,
  entry: { what_you_did: string; impact: string; url?: string | null }
): Promise<GoalEvidence> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('goal_evidence')
    .insert({ plan_id: planId, user_id: userId, ...entry })
    .select()
    .single()
  if (error) throw error
  return data as GoalEvidence
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add lib/db/goal-evidence.ts
git commit -m "feat: add goal-evidence DB helper"
```

---

## Task 8: Seeding script

**Files:**
- Create: `scripts/seed-resources.ts`

The script runs locally with `npx tsx scripts/seed-resources.ts`. It uses the Supabase service role key (bypasses RLS) and the Anthropic SDK to generate curated resources for each skill.

- [ ] **Step 1: Install dependencies for the script**

These go in `devDependencies` — they are not bundled into the app:
```bash
npm install -D @anthropic-ai/sdk tsx
```

- [ ] **Step 2: Create the script**

```typescript
// scripts/seed-resources.ts
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { SKILLS } from '../lib/skills'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface RawResource {
  title: string
  url: string
  description: string
  resource_type: 'book' | 'article' | 'course' | 'video' | 'person' | 'podcast' | 'tool'
  author: string | null
}

async function generateResources(skillKey: string, skillLabel: string, skillDescription: string): Promise<RawResource[]> {
  const response = await anthropic.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 2048,
    system: 'You are a curator of management development resources. Return only valid JSON — no markdown, no code fences, no prose.',
    messages: [{
      role: 'user',
      content: `Generate up to 8 curated resources for a management skill called "${skillLabel}".

Skill description: ${skillDescription}

Return a JSON array where each object has exactly these keys:
- "title": string
- "url": string (a real, publicly accessible URL)
- "description": string (2–3 sentences on why it's valuable for this skill)
- "resource_type": one of "book", "article", "course", "video", "person", "podcast", "tool"
- "author": string or null

Prioritise high-quality, well-known resources. Mix types where possible. Return only the JSON array.`,
    }],
  })

  const textBlock = response.content.filter(b => b.type === 'text').pop()
  if (!textBlock || textBlock.type !== 'text') return []

  try {
    const match = textBlock.text.match(/\[[\s\S]*\]/)
    if (!match) return []
    const parsed = JSON.parse(match[0])
    if (!Array.isArray(parsed)) return []
    return parsed.filter((r: any) =>
      typeof r.title === 'string' &&
      typeof r.url === 'string' &&
      typeof r.description === 'string' &&
      ['book', 'article', 'course', 'video', 'person', 'podcast', 'tool'].includes(r.resource_type)
    ) as RawResource[]
  } catch {
    console.error(`  ✗ JSON parse failed for ${skillKey}`)
    return []
  }
}

async function upsertResources(skillKey: string, resources: RawResource[]): Promise<void> {
  for (const resource of resources) {
    const { data, error } = await supabase
      .from('resources')
      .upsert(
        { ...resource, updated_at: new Date().toISOString() },
        { onConflict: 'url' }
      )
      .select('id')
      .single()

    if (error) {
      console.error(`  ✗ Upsert failed for "${resource.title}":`, error.message)
      continue
    }

    const resourceId = data.id
    const { error: srError } = await supabase
      .from('skill_resources')
      .upsert(
        { resource_id: resourceId, skill_key: skillKey, relevance_score: 3 },
        { onConflict: 'resource_id,skill_key' }
      )

    if (srError) {
      console.error(`  ✗ skill_resources upsert failed:`, srError.message)
    } else {
      console.log(`  ✓ ${resource.resource_type}: ${resource.title}`)
    }
  }
}

async function main() {
  console.log(`Seeding resources for ${SKILLS.length} skills...\n`)

  for (const skill of SKILLS) {
    console.log(`→ ${skill.label} (${skill.key})`)
    const resources = await generateResources(skill.key, skill.label, skill.description)
    console.log(`  Generated ${resources.length} resources`)
    await upsertResources(skill.key, resources)
    // Brief pause to avoid rate limits
    await new Promise(r => setTimeout(r, 500))
  }

  console.log('\nDone.')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
```

- [ ] **Step 3: Add required env vars to .env.local (if not already present)**

Confirm these exist in `.env.local`:
```
ANTHROPIC_API_KEY=sk-ant-...
NEXT_PUBLIC_SUPABASE_URL=https://...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

Do NOT commit `.env.local`.

- [ ] **Step 4: Run a dry-run against one skill to verify**

```bash
ANTHROPIC_API_KEY=... NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
  npx tsx scripts/seed-resources.ts
```

Watch the console for ✓ entries and check the `resources` table in Supabase.

- [ ] **Step 5: Commit**

```bash
git add scripts/seed-resources.ts package.json package-lock.json
git commit -m "feat: add resource seeding script using Claude API"
```

---

## Task 9: Rewrite app/resources/page.tsx (DB-driven)

**Files:**
- Modify: `app/resources/page.tsx`

- [ ] **Step 1: Rewrite the page as a server component**

```typescript
import Link from 'next/link'
import { getAllResources } from '@/lib/db/resources'
import type { Resource } from '@/lib/db/resources'

export const metadata = { title: 'Resources' }

const TYPE_HEADINGS: Record<Resource['resource_type'], string> = {
  book: 'Books',
  article: 'Articles',
  course: 'Courses',
  video: 'Videos',
  person: 'People worth following',
  podcast: 'Podcasts',
  tool: 'Tools & assessments',
}

export default async function ResourcesPage() {
  const resources = await getAllResources()

  const byType = resources.reduce<Record<string, Resource[]>>((acc, r) => {
    ;(acc[r.resource_type] ??= []).push(r)
    return acc
  }, {})

  const orderedTypes: Resource['resource_type'][] = [
    'book', 'article', 'course', 'video', 'person', 'podcast', 'tool',
  ]

  return (
    <div style={{ background: 'var(--color-bg-base)', minHeight: '100vh' }}>
      <div
        className="mx-auto px-6 pb-20 pt-16"
        style={{ maxWidth: 'var(--container-width)' }}
      >
        <header className="mb-12">
          <h1
            className="mb-4"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
              fontWeight: 600,
              letterSpacing: '-0.02em',
              color: 'var(--color-text-primary)',
            }}
          >
            Resources
          </h1>
          <p style={{ color: 'var(--color-text-muted)' }}>
            Things I keep coming back to. No affiliate links. No filler.
          </p>
        </header>

        {resources.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)' }}>
            Resources are being added — check back soon.
          </p>
        ) : (
          <div className="grid gap-12 sm:grid-cols-2">
            {orderedTypes.filter(t => byType[t]?.length).map(type => (
              <section key={type}>
                <h2
                  className="mb-5 pb-2 text-lg font-bold"
                  style={{
                    fontFamily: 'var(--font-display)',
                    color: 'var(--color-text-primary)',
                    borderBottom: '1px solid var(--color-accent)',
                  }}
                >
                  {TYPE_HEADINGS[type]}
                </h2>
                <ul className="space-y-5">
                  {byType[type].map(item => (
                    <li key={item.id}>
                      <Link
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mb-1 block text-sm font-semibold hover:opacity-80"
                        style={{ color: 'var(--color-text-primary)' }}
                      >
                        {item.title}
                        {item.author && ` — ${item.author}`}{' '}
                        <span style={{ color: 'var(--color-accent)' }}>↗</span>
                      </Link>
                      <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                        {item.description}
                      </p>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add app/resources/page.tsx
git commit -m "feat: make resources page DB-driven"
```

---

## Task 10: Check-in utility + tests

**Files:**
- Create: `lib/utils/checkin.ts`
- Create: `lib/utils/__tests__/checkin.test.ts`

This pure utility is extracted so it can be unit-tested independently of components.

- [ ] **Step 1: Write the failing tests**

```typescript
// lib/utils/__tests__/checkin.test.ts
import { describe, it, expect } from 'vitest'
import { getCheckinChip } from '../checkin'
import type { DevelopmentPlan } from '@/lib/db/development-plans'

function makePlan(overrides: Partial<DevelopmentPlan> = {}): DevelopmentPlan {
  return {
    id: 'plan-1',
    user_id: 'user-1',
    skill_key: 'self-resilience',
    pillar: 'self',
    goal: 'Improve resilience',
    target_date: null,
    status: 'planned',
    checkin_frequency_weeks: null,
    last_checkin_at: null,
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }
}

describe('getCheckinChip', () => {
  it('returns null when no checkin_frequency_weeks is set', () => {
    expect(getCheckinChip(makePlan())).toBeNull()
  })

  it('returns amber "overdue" chip when past due', () => {
    const lastCheckin = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
    const chip = getCheckinChip(makePlan({ checkin_frequency_weeks: 2, last_checkin_at: lastCheckin }))
    expect(chip?.color).toBe('amber')
    expect(chip?.label).toBe('Check-in overdue')
  })

  it('returns green chip with days remaining when not yet due', () => {
    const lastCheckin = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
    const chip = getCheckinChip(makePlan({ checkin_frequency_weeks: 4, last_checkin_at: lastCheckin }))
    expect(chip?.color).toBe('green')
    expect(chip?.label).toMatch(/Check-in due in \d+ days?/)
  })

  it('uses created_at as baseline when last_checkin_at is null', () => {
    const recentPlan = makePlan({
      checkin_frequency_weeks: 4,
      last_checkin_at: null,
      created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    })
    const chip = getCheckinChip(recentPlan)
    expect(chip?.color).toBe('green')
  })
})
```

- [ ] **Step 2: Run to verify they fail**

```bash
npm test -- lib/utils/__tests__/checkin.test.ts
```
Expected: FAIL — `getCheckinChip` not found.

- [ ] **Step 3: Implement the utility**

```typescript
// lib/utils/checkin.ts
import type { DevelopmentPlan } from '@/lib/db/development-plans'

export interface CheckinChip {
  color: 'green' | 'amber'
  label: string
}

export function getCheckinChip(plan: DevelopmentPlan): CheckinChip | null {
  if (!plan.checkin_frequency_weeks) return null
  const base = plan.last_checkin_at
    ? new Date(plan.last_checkin_at)
    : new Date(plan.created_at)
  const nextDue = new Date(base.getTime() + plan.checkin_frequency_weeks * 7 * 24 * 60 * 60 * 1000)
  const now = new Date()
  if (nextDue < now) return { color: 'amber', label: 'Check-in overdue' }
  const daysUntil = Math.ceil((nextDue.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  return { color: 'green', label: `Check-in due in ${daysUntil} day${daysUntil === 1 ? '' : 's'}` }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- lib/utils/__tests__/checkin.test.ts
```
Expected: 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/utils/checkin.ts lib/utils/__tests__/checkin.test.ts
git commit -m "feat: add getCheckinChip utility with tests"
```

---

## Task 11: ActiveGoalsPanel component

**Files:**
- Create: `components/app/ActiveGoalsPanel.tsx`

- [ ] **Step 1: Create the component**

```typescript
'use client'

import Link from 'next/link'
import { getCheckinChip } from '@/lib/utils/checkin'
import type { DevelopmentPlan } from '@/lib/db/development-plans'
import { SKILLS, PILLAR_LABELS, type Pillar } from '@/lib/skills'

interface ActiveGoalsPanelProps {
  plans: DevelopmentPlan[]
}

export function ActiveGoalsPanel({ plans }: ActiveGoalsPanelProps) {
  const active = plans
    .filter(p => p.status === 'planned' || p.status === 'in_progress')
    .sort((a, b) => {
      const aChip = getCheckinChip(a)
      const bChip = getCheckinChip(b)
      if (aChip?.color === 'amber' && bChip?.color !== 'amber') return -1
      if (bChip?.color === 'amber' && aChip?.color !== 'amber') return 1
      return 0
    })

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold text-white">Active Goals</h2>
        {active.length > 0 && (
          <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-semibold text-amber-400">
            {active.length}
          </span>
        )}
      </div>

      {active.length === 0 ? (
        <p className="text-sm text-slate-500">No active goals yet.</p>
      ) : (
        active.map(plan => <GoalCard key={plan.id} plan={plan} />)
      )}

      <Link
        href="/growth/goal/new"
        className="mt-1 flex items-center justify-center rounded-xl border border-dashed border-indigo-500/40 px-4 py-3 text-sm font-medium text-indigo-400 hover:border-indigo-400 hover:text-indigo-300"
      >
        + Add a goal
      </Link>
    </div>
  )
}

function GoalCard({ plan }: { plan: DevelopmentPlan }) {
  const skill = SKILLS.find(s => s.key === plan.skill_key)
  const chip = getCheckinChip(plan)

  return (
    <Link
      href={`/growth/goal/${plan.id}`}
      className="flex flex-col gap-2 rounded-xl bg-slate-800 px-4 py-3 hover:bg-slate-700"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-white">{skill?.label ?? plan.skill_key}</p>
          <p className="text-xs text-slate-500">
            {PILLAR_LABELS[plan.pillar as Pillar] ?? plan.pillar}
          </p>
        </div>
        {chip && (
          <span
            className="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium"
            style={
              chip.color === 'amber'
                ? { background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }
                : { background: 'rgba(74,222,128,0.15)', color: '#4ade80' }
            }
          >
            {chip.label}
          </span>
        )}
      </div>
      <p className="line-clamp-2 text-xs text-slate-400">{plan.goal}</p>
      {plan.target_date && (
        <p className="text-xs text-slate-600">
          Target: {new Date(plan.target_date).toLocaleDateString()}
        </p>
      )}
    </Link>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add components/app/ActiveGoalsPanel.tsx
git commit -m "feat: add ActiveGoalsPanel component with check-in chips"
```

---

## Task 12: OpportunitiesPanel component

**Files:**
- Create: `components/app/OpportunitiesPanel.tsx`

- [ ] **Step 1: Create the component**

This is a server component — it receives pre-computed data from the parent page.

```typescript
import Link from 'next/link'
import { LEVEL_VALUES, LEVEL_COLORS, type Level, PILLAR_LABELS, type Pillar } from '@/lib/skills'

interface Opportunity {
  key: string
  label: string
  pillar: Pillar
  level: Level
  score: number
}

interface OpportunitiesPanelProps {
  opportunities: Opportunity[]
}

export function OpportunitiesPanel({ opportunities }: OpportunitiesPanelProps) {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <h2 className="text-sm font-semibold text-white">Top Opportunities</h2>
        <p className="text-xs text-slate-500">Lowest-scoring, no active goal</p>
      </div>

      {opportunities.length === 0 ? (
        <p className="text-sm text-slate-500">All low-scoring skills have active goals.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {opportunities.map(opp => (
            <div
              key={opp.key}
              className="flex items-center gap-3 rounded-xl bg-slate-800 px-4 py-3"
            >
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium text-white">{opp.label}</p>
                <p className="text-xs text-slate-500">
                  {PILLAR_LABELS[opp.pillar]} · {opp.level}
                </p>
              </div>
              <span
                className="shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold"
                style={{
                  color: LEVEL_COLORS[opp.level],
                  background: `${LEVEL_COLORS[opp.level]}20`,
                }}
              >
                {opp.score}
              </span>
              <Link
                href={`/growth/goal/new?skill=${opp.key}`}
                className="shrink-0 rounded-lg bg-indigo-600 px-3 py-1 text-xs font-semibold text-white hover:bg-indigo-500"
              >
                Set goal →
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add components/app/OpportunitiesPanel.tsx
git commit -m "feat: add OpportunitiesPanel component"
```

---

## Task 13: SkillsTable component + tests

**Files:**
- Create: `components/app/SkillsTable.tsx`
- Create: `components/app/__tests__/SkillsTable.test.tsx`

- [ ] **Step 1: Write the failing tests**

```typescript
// components/app/__tests__/SkillsTable.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SkillsTable } from '../SkillsTable'
import type { SkillRow } from '../SkillsTable'

const ROWS: SkillRow[] = [
  { key: 'strategy-goal-setting', label: 'Goal Setting', pillar: 'strategy', pillarLabel: 'Strategy', level: 'Basic', score: 2, status: 'opportunity' },
  { key: 'self-resilience', label: 'Resilience', pillar: 'self', pillarLabel: 'Self', level: 'Advanced', score: 4, status: null },
  { key: 'team-coaching-mentoring', label: 'Coaching & Mentoring', pillar: 'team', pillarLabel: 'Team', level: 'Proficient', score: 3, status: 'goal' },
]

describe('SkillsTable', () => {
  it('renders all skill rows', () => {
    render(<SkillsTable rows={ROWS} />)
    expect(screen.getByText('Goal Setting')).toBeInTheDocument()
    expect(screen.getByText('Resilience')).toBeInTheDocument()
    expect(screen.getByText('Coaching & Mentoring')).toBeInTheDocument()
  })

  it('shows opportunity chip for skills with status=opportunity', () => {
    render(<SkillsTable rows={ROWS} />)
    expect(screen.getByText('💡 Opportunity')).toBeInTheDocument()
  })

  it('shows goal chip for skills with status=goal', () => {
    render(<SkillsTable rows={ROWS} />)
    expect(screen.getByText('🎯 Active goal')).toBeInTheDocument()
  })

  it('sorts by rating ascending by default (lowest first)', () => {
    render(<SkillsTable rows={ROWS} />)
    const cells = screen.getAllByRole('row').slice(1) // skip header
    expect(cells[0]).toHaveTextContent('Goal Setting') // score 2
    expect(cells[1]).toHaveTextContent('Coaching & Mentoring') // score 3
    expect(cells[2]).toHaveTextContent('Resilience') // score 4
  })

  it('sorts by skill name alphabetically when Skill button clicked', () => {
    render(<SkillsTable rows={ROWS} />)
    fireEvent.click(screen.getByRole('button', { name: /skill/i }))
    const cells = screen.getAllByRole('row').slice(1)
    expect(cells[0]).toHaveTextContent('Coaching & Mentoring')
    expect(cells[1]).toHaveTextContent('Goal Setting')
    expect(cells[2]).toHaveTextContent('Resilience')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- components/app/__tests__/SkillsTable.test.tsx
```
Expected: FAIL — `SkillsTable` not found.

- [ ] **Step 3: Create the component**

```typescript
'use client'

import { useState } from 'react'
import { LEVEL_COLORS, type Level, type Pillar } from '@/lib/skills'

export interface SkillRow {
  key: string
  label: string
  pillar: Pillar
  pillarLabel: string
  level: Level
  score: number
  status: 'opportunity' | 'goal' | null
}

type SortKey = 'rating' | 'pillar' | 'skill'

interface SkillsTableProps {
  rows: SkillRow[]
}

export function SkillsTable({ rows }: SkillsTableProps) {
  const [sort, setSort] = useState<SortKey>('rating')

  const sorted = [...rows].sort((a, b) => {
    if (sort === 'rating') return a.score - b.score
    if (sort === 'pillar') return a.pillarLabel.localeCompare(b.pillarLabel) || a.label.localeCompare(b.label)
    return a.label.localeCompare(b.label)
  })

  const SORT_BUTTONS: { key: SortKey; label: string }[] = [
    { key: 'rating', label: 'Rating ↑' },
    { key: 'pillar', label: 'Pillar' },
    { key: 'skill', label: 'Skill' },
  ]

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white">All Skills</h2>
        <div className="flex gap-1">
          {SORT_BUTTONS.map(btn => (
            <button
              key={btn.key}
              onClick={() => setSort(btn.key)}
              className="rounded-full px-3 py-1 text-xs font-medium transition-colors"
              style={
                sort === btn.key
                  ? { background: '#f59e0b', color: '#0f172a' }
                  : { border: '1px solid #334155', color: '#94a3b8' }
              }
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-700">
        <table className="w-full text-sm">
          <thead className="bg-slate-800">
            <tr>
              {['Pillar', 'Skill', 'Level', 'Score', 'Status'].map(h => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {sorted.map(row => (
              <tr key={row.key} className="bg-slate-800/50 hover:bg-slate-800">
                <td className="px-4 py-3 text-xs text-slate-400">{row.pillarLabel}</td>
                <td className="px-4 py-3 font-medium text-white">{row.label}</td>
                <td className="px-4 py-3 text-xs text-slate-400">{row.level}</td>
                <td className="px-4 py-3">
                  <span
                    className="rounded-full px-2 py-0.5 text-xs font-semibold"
                    style={{
                      color: LEVEL_COLORS[row.level],
                      background: `${LEVEL_COLORS[row.level]}20`,
                    }}
                  >
                    {row.score}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {row.status === 'opportunity' && (
                    <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-xs font-medium text-indigo-300">
                      💡 Opportunity
                    </span>
                  )}
                  {row.status === 'goal' && (
                    <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-medium text-amber-300">
                      🎯 Active goal
                    </span>
                  )}
                  {!row.status && <span className="text-slate-600">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- components/app/__tests__/SkillsTable.test.tsx
```
Expected: 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add components/app/SkillsTable.tsx components/app/__tests__/SkillsTable.test.tsx
git commit -m "feat: add sortable SkillsTable component with tests"
```

---

## Task 14: Rewrite app/(app)/growth/page.tsx

**Files:**
- Modify: `app/(app)/growth/page.tsx`
- Delete: `components/app/GrowthView.tsx`

- [ ] **Step 1: Rewrite the page**

```typescript
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getLatestCompleteRound } from '@/lib/db/rounds'
import { getScoresForRound } from '@/lib/db/scores'
import { getPlansForUser } from '@/lib/db/development-plans'
import { SKILLS, PILLAR_LABELS, LEVEL_VALUES, type Pillar, type Level } from '@/lib/skills'
import { ActiveGoalsPanel } from '@/components/app/ActiveGoalsPanel'
import { OpportunitiesPanel } from '@/components/app/OpportunitiesPanel'
import { SkillsTable } from '@/components/app/SkillsTable'
import type { SkillRow } from '@/components/app/SkillsTable'

export default async function GrowthPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const round = await getLatestCompleteRound(user.id)
  const [scores, plans] = await Promise.all([
    round ? getScoresForRound(round.id) : Promise.resolve([]),
    getPlansForUser(user.id),
  ])

  const activePlanKeys = new Set(
    plans.filter(p => p.status !== 'completed').map(p => p.skill_key)
  )

  const scoreByKey = Object.fromEntries(scores.map(s => [s.skill_key, s]))

  // Top 5 lowest-scoring skills with no active plan
  const opportunities = SKILLS
    .filter(s => !activePlanKeys.has(s.key))
    .map(s => {
      const score = scoreByKey[s.key]
      const level = (score?.level ?? 'Basic') as Level
      return { key: s.key, label: s.label, pillar: s.pillar as Pillar, level, score: LEVEL_VALUES[level] }
    })
    .sort((a, b) => a.score - b.score)
    .slice(0, 5)

  const tableRows: SkillRow[] = SKILLS.map(s => {
    const score = scoreByKey[s.key]
    const level = (score?.level ?? 'Basic') as Level
    const numScore = LEVEL_VALUES[level]
    const hasGoal = activePlanKeys.has(s.key)
    let status: SkillRow['status'] = null
    if (hasGoal) status = 'goal'
    else if (numScore <= 2) status = 'opportunity'
    return {
      key: s.key,
      label: s.label,
      pillar: s.pillar as Pillar,
      pillarLabel: PILLAR_LABELS[s.pillar as Pillar],
      level,
      score: numScore,
      status,
    }
  })

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Growth</h1>
        <p className="mt-1 text-sm text-slate-400">
          Set focused goals for the skills you want to develop.
        </p>
      </div>

      {/* Top two-column section */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ActiveGoalsPanel plans={plans} />
        <OpportunitiesPanel opportunities={opportunities} />
      </div>

      {/* All-skills table */}
      <SkillsTable rows={tableRows} />
    </div>
  )
}
```

- [ ] **Step 2: Delete GrowthView.tsx**

```bash
rm components/app/GrowthView.tsx
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors. If any file still imports `GrowthView`, update those imports.

- [ ] **Step 4: Commit**

```bash
git add app/(app)/growth/page.tsx
git rm components/app/GrowthView.tsx
git commit -m "feat: rewrite growth page with ActiveGoalsPanel, OpportunitiesPanel, SkillsTable"
```

---

## Task 15: Server actions for goal management

**Files:**
- Modify: `app/(app)/growth/actions.ts`

Replace the entire file with all goal-related actions:

- [ ] **Step 1: Rewrite the actions file**

```typescript
'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { upsertPlan, markPlanComplete, updateLastCheckin } from '@/lib/db/development-plans'
import { bulkAddGoalResources, addGoalResource, removeGoalResource } from '@/lib/db/goal-resources'
import { addEvidence } from '@/lib/db/goal-evidence'

async function getAuthenticatedUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  return user
}

export async function saveGoalAction(formData: FormData): Promise<void> {
  const user = await getAuthenticatedUser()

  const skill_key = formData.get('skill_key') as string
  const pillar = formData.get('pillar') as string
  const goal = formData.get('goal') as string
  const target_date = (formData.get('target_date') as string) || null
  const checkin_raw = formData.get('checkin_frequency_weeks') as string
  const checkin_frequency_weeks = checkin_raw ? parseInt(checkin_raw, 10) : null
  const resource_ids_raw = formData.get('resource_ids') as string

  if (!skill_key || !pillar || !goal) return

  const plan = await upsertPlan(user.id, {
    skill_key,
    pillar,
    goal,
    target_date,
    status: 'planned',
    checkin_frequency_weeks,
  })

  if (resource_ids_raw) {
    const resource_ids: string[] = JSON.parse(resource_ids_raw)
    await bulkAddGoalResources(plan.id, resource_ids, user.id)
  }

  revalidatePath('/growth')
  redirect(`/growth/goal/${plan.id}`)
}

export async function markGoalCompleteAction(planId: string): Promise<void> {
  await getAuthenticatedUser()
  await markPlanComplete(planId)
  revalidatePath('/growth')
  revalidatePath(`/growth/goal/${planId}`)
}

export async function addEvidenceAction(formData: FormData): Promise<void> {
  const user = await getAuthenticatedUser()

  const plan_id = formData.get('plan_id') as string
  const what_you_did = formData.get('what_you_did') as string
  const impact = formData.get('impact') as string
  const url = (formData.get('url') as string) || null

  if (!plan_id || !what_you_did || !impact) return

  await addEvidence(plan_id, user.id, { what_you_did, impact, url })
  await updateLastCheckin(plan_id)

  revalidatePath(`/growth/goal/${plan_id}`)
}

export async function addGoalResourceAction(planId: string, resourceId: string): Promise<void> {
  const user = await getAuthenticatedUser()
  await addGoalResource(planId, resourceId, user.id)
  revalidatePath(`/growth/goal/${planId}`)
}

export async function removeGoalResourceAction(planId: string, resourceId: string): Promise<void> {
  await getAuthenticatedUser()
  await removeGoalResource(planId, resourceId)
  revalidatePath(`/growth/goal/${planId}`)
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add app/(app)/growth/actions.ts
git commit -m "feat: add all goal server actions (save, complete, evidence, resources)"
```

---

## Task 16: ResourceRow + ResourcePanel components

**Files:**
- Create: `components/app/ResourceRow.tsx`
- Create: `components/app/ResourcePanel.tsx`

- [ ] **Step 1: Create ResourceRow**

```typescript
'use client'

import { Plus, BookmarkCheck } from 'lucide-react'
import type { Resource } from '@/lib/db/resources'

const TYPE_COLORS: Record<Resource['resource_type'], string> = {
  book: '#6366f1',
  article: '#14b8a6',
  course: '#14b8a6',
  video: '#ef4444',
  person: '#f59e0b',
  podcast: '#a855f7',
  tool: '#64748b',
}

interface ResourceRowProps {
  resource: Resource
  added: boolean
  onToggle: (resourceId: string) => void
}

export function ResourceRow({ resource, added, onToggle }: ResourceRowProps) {
  const color = TYPE_COLORS[resource.resource_type]

  return (
    <div
      className="flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors"
      style={added ? { border: '1px solid #f59e0b33', background: '#1c1a0f' } : { border: '1px solid transparent' }}
    >
      <span
        className="mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-xs font-semibold uppercase"
        style={{ background: `${color}25`, color }}
      >
        {resource.resource_type}
      </span>
      <div className="min-w-0 flex-1">
        <a
          href={resource.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-white hover:text-amber-300"
        >
          {resource.title}
          {resource.author && <span className="font-normal text-slate-400"> — {resource.author}</span>}
        </a>
        <p className="mt-0.5 text-xs text-slate-500">{resource.description}</p>
      </div>
      <button
        onClick={() => onToggle(resource.id)}
        className="shrink-0 flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors"
        style={
          added
            ? { background: '#f59e0b20', color: '#f59e0b' }
            : { background: '#4f46e520', color: '#818cf8' }
        }
        title={added ? 'Remove' : 'Add'}
      >
        {added ? (
          <>
            <BookmarkCheck size={12} strokeWidth={1.75} />
            Added
          </>
        ) : (
          <>
            <Plus size={12} strokeWidth={1.75} />
            Add
          </>
        )}
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Create ResourcePanel**

```typescript
'use client'

import { useState } from 'react'
import { ResourceRow } from './ResourceRow'
import type { Resource } from '@/lib/db/resources'

interface ResourcePanelProps {
  skillLabel: string
  resources: Resource[]
  initialPinnedIds?: string[]
  onPinnedChange?: (ids: string[]) => void
}

export function ResourcePanel({ skillLabel, resources, initialPinnedIds = [], onPinnedChange }: ResourcePanelProps) {
  const [showAll, setShowAll] = useState(false)
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set(initialPinnedIds))

  const visible = showAll ? resources : resources.slice(0, 4)

  function toggleResource(resourceId: string) {
    setPinnedIds(prev => {
      const next = new Set(prev)
      if (next.has(resourceId)) next.delete(resourceId)
      else next.add(resourceId)
      onPinnedChange?.([...next])
      return next
    })
  }

  return (
    <div className="rounded-xl bg-slate-800 p-4">
      <h3 className="mb-3 text-sm font-semibold text-white">
        Resources for {skillLabel}
      </h3>

      {resources.length === 0 ? (
        <p className="text-xs text-slate-500">No resources yet — run the seed script to populate.</p>
      ) : (
        <>
          <div className="flex flex-col gap-1">
            {visible.map(r => (
              <ResourceRow
                key={r.id}
                resource={r}
                added={pinnedIds.has(r.id)}
                onToggle={toggleResource}
              />
            ))}
          </div>

          {resources.length > 4 && !showAll && (
            <button
              onClick={() => setShowAll(true)}
              className="mt-2 text-xs text-indigo-400 hover:text-indigo-300"
            >
              Show all {resources.length} →
            </button>
          )}
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add components/app/ResourceRow.tsx components/app/ResourcePanel.tsx
git commit -m "feat: add ResourceRow and ResourcePanel components"
```

---

## Task 17: GoalForm + /growth/goal/new page

**Files:**
- Create: `components/app/GoalForm.tsx`
- Create: `app/(app)/growth/goal/new/page.tsx`

- [ ] **Step 1: Create GoalForm**

```typescript
'use client'

import { useState } from 'react'
import { ResourcePanel } from './ResourcePanel'
import { saveGoalAction } from '@/app/(app)/growth/actions'
import { SKILLS, PILLAR_LABELS, type Pillar } from '@/lib/skills'
import type { Resource } from '@/lib/db/resources'

interface GoalFormProps {
  initialSkillKey?: string
  resources: Resource[]
  allSkillsForSelector: { key: string; label: string; pillar: Pillar }[]
}

const CHECKIN_OPTIONS = [
  { label: 'Every 2 weeks', value: '2' },
  { label: 'Every 4 weeks', value: '4' },
  { label: 'Every 6 weeks', value: '6' },
  { label: 'Every 8 weeks', value: '8' },
  { label: 'Custom', value: 'custom' },
]

export function GoalForm({ initialSkillKey, resources, allSkillsForSelector }: GoalFormProps) {
  const [selectedSkillKey, setSelectedSkillKey] = useState(initialSkillKey ?? '')
  const [pinnedIds, setPinnedIds] = useState<string[]>([])
  const [checkin, setCheckin] = useState('')
  const [customWeeks, setCustomWeeks] = useState('')

  const selectedSkill = SKILLS.find(s => s.key === selectedSkillKey)
  const checkinValue = checkin === 'custom' ? customWeeks : checkin

  return (
    <form action={async (fd: FormData) => {
      fd.set('resource_ids', JSON.stringify(pinnedIds))
      if (checkinValue) fd.set('checkin_frequency_weeks', checkinValue)
      await saveGoalAction(fd)
    }}>
      <input type="hidden" name="skill_key" value={selectedSkillKey} />
      <input type="hidden" name="pillar" value={selectedSkill?.pillar ?? ''} />

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* Left — form */}
        <div className="flex flex-col gap-5">
          {/* Skill selector (shown only when no initial skill) */}
          {!initialSkillKey && (
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-400">Skill</label>
              <select
                value={selectedSkillKey}
                onChange={e => setSelectedSkillKey(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-amber-400 focus:outline-none"
              >
                <option value="">Select a skill…</option>
                {allSkillsForSelector.map(s => (
                  <option key={s.key} value={s.key}>
                    {PILLAR_LABELS[s.pillar]} — {s.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Skill header (shown when skill is selected) */}
          {selectedSkill && (
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white">{selectedSkill.label}</h2>
                <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-semibold text-amber-400">
                  {PILLAR_LABELS[selectedSkill.pillar as Pillar]}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-400">{selectedSkill.description}</p>
            </div>
          )}

          {/* Goal textarea */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-400">
              What do you want to achieve?
            </label>
            <textarea
              name="goal"
              required
              rows={3}
              placeholder="Describe the specific outcome you're aiming for…"
              className="w-full resize-none rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
            />
          </div>

          {/* Target date */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-400">
              Target date (optional)
            </label>
            <input
              type="date"
              name="target_date"
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-amber-400 focus:outline-none"
            />
          </div>

          {/* Check-in frequency */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-400">
              Check-in every
            </label>
            <select
              value={checkin}
              onChange={e => setCheckin(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-amber-400 focus:outline-none"
            >
              <option value="">No check-in reminder</option>
              {CHECKIN_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            {checkin === 'custom' && (
              <input
                type="number"
                min="1"
                placeholder="Weeks"
                value={customWeeks}
                onChange={e => setCustomWeeks(e.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-amber-400 focus:outline-none"
              />
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="submit"
              className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
            >
              Save goal
            </button>
            <a
              href="/growth"
              className="rounded-lg px-5 py-2 text-sm text-slate-400 hover:text-white"
            >
              Cancel
            </a>
          </div>
        </div>

        {/* Right — resource panel */}
        {selectedSkill && (
          <ResourcePanel
            skillLabel={selectedSkill.label}
            resources={resources}
            onPinnedChange={setPinnedIds}
          />
        )}
      </div>
    </form>
  )
}
```

- [ ] **Step 2: Create the /growth/goal/new page**

```typescript
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getResourcesForSkill, getAllResources } from '@/lib/db/resources'
import { SKILLS, type Pillar } from '@/lib/skills'
import { GoalForm } from '@/components/app/GoalForm'

interface NewGoalPageProps {
  searchParams: Promise<{ skill?: string }>
}

export default async function NewGoalPage({ searchParams }: NewGoalPageProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { skill: skillKey } = await searchParams
  const resources = skillKey
    ? await getResourcesForSkill(skillKey)
    : await getAllResources().then(() => []) // empty until skill selected

  const allSkillsForSelector = SKILLS.map(s => ({
    key: s.key,
    label: s.label,
    pillar: s.pillar as Pillar,
  }))

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-white">
        {skillKey ? 'Set a goal' : 'Add a goal'}
      </h1>
      <GoalForm
        initialSkillKey={skillKey}
        resources={resources}
        allSkillsForSelector={allSkillsForSelector}
      />
    </div>
  )
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add components/app/GoalForm.tsx app/(app)/growth/goal/new/page.tsx
git commit -m "feat: add GoalForm and /growth/goal/new page"
```

---

## Task 18: ProgressStrip + EvidenceLog components

**Files:**
- Create: `components/app/ProgressStrip.tsx`
- Create: `components/app/EvidenceLog.tsx`

- [ ] **Step 1: Create ProgressStrip**

```typescript
'use client'

import { getCheckinChip } from '@/lib/utils/checkin'
import type { DevelopmentPlan } from '@/lib/db/development-plans'

interface ProgressStripProps {
  plan: DevelopmentPlan
}

export function ProgressStrip({ plan }: ProgressStripProps) {
  if (!plan.target_date && !plan.checkin_frequency_weeks) return null

  const now = new Date()
  const chip = getCheckinChip(plan)

  let daysRemaining: number | null = null
  let progressPercent: number | null = null

  if (plan.target_date) {
    const target = new Date(plan.target_date)
    const created = new Date(plan.created_at)
    daysRemaining = Math.max(0, Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    const total = target.getTime() - created.getTime()
    const elapsed = now.getTime() - created.getTime()
    progressPercent = Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)))
  }

  return (
    <div className="flex flex-wrap items-center gap-4 rounded-xl bg-slate-800 px-5 py-4">
      {daysRemaining !== null && (
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold text-white">{daysRemaining}</span>
          <span className="text-sm text-slate-400">days remaining</span>
        </div>
      )}

      {progressPercent !== null && (
        <div className="flex-1 min-w-[120px]">
          <div className="h-2 overflow-hidden rounded-full bg-slate-700">
            <div
              className="h-full rounded-full bg-amber-400 transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-slate-500">{progressPercent}% elapsed</p>
        </div>
      )}

      {chip && (
        <span
          className="rounded-full px-3 py-1 text-xs font-semibold"
          style={
            chip.color === 'amber'
              ? { background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }
              : { background: 'rgba(74,222,128,0.15)', color: '#4ade80' }
          }
        >
          {chip.color === 'green' ? '✓ On track — ' : '⚠ '}{chip.label}
        </span>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create EvidenceLog**

```typescript
'use client'

import { useState } from 'react'
import { addEvidenceAction } from '@/app/(app)/growth/actions'
import type { GoalEvidence } from '@/lib/db/goal-evidence'

interface EvidenceLogProps {
  planId: string
  entries: GoalEvidence[]
}

export function EvidenceLog({ planId, entries }: EvidenceLogProps) {
  const [showForm, setShowForm] = useState(false)

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Evidence log</h3>
        <button
          onClick={() => setShowForm(v => !v)}
          className="rounded-lg bg-amber-500/20 px-3 py-1 text-xs font-semibold text-amber-400 hover:bg-amber-500/30"
        >
          + Add evidence
        </button>
      </div>

      {showForm && (
        <form
          action={async (fd: FormData) => {
            fd.set('plan_id', planId)
            await addEvidenceAction(fd)
            setShowForm(false)
          }}
          className="mb-6 rounded-xl border border-slate-700 bg-slate-800 p-4"
        >
          <div className="mb-3">
            <label className="mb-1 block text-xs font-semibold text-slate-400">
              What did you do?
            </label>
            <textarea
              name="what_you_did"
              required
              rows={2}
              className="w-full resize-none rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
            />
          </div>
          <div className="mb-3">
            <label className="mb-1 block text-xs font-semibold text-slate-400">
              What was the impact or outcome?
            </label>
            <textarea
              name="impact"
              required
              rows={2}
              className="w-full resize-none rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
            />
          </div>
          <div className="mb-4">
            <label className="mb-1 block text-xs font-semibold text-slate-400">
              Link (optional)
            </label>
            <input
              type="url"
              name="url"
              placeholder="https://…"
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="rounded-lg bg-amber-500 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-400"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-lg px-4 py-2 text-xs text-slate-400 hover:text-white"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {entries.length === 0 ? (
        <p className="text-sm text-slate-500">No evidence yet. Add your first entry above.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {entries.map(entry => (
            <div
              key={entry.id}
              className="rounded-xl bg-slate-800 px-5 py-4"
              style={{ borderLeft: '3px solid #4ade80' }}
            >
              <p className="mb-1 text-xs text-slate-500">
                {new Date(entry.created_at).toLocaleDateString('en-GB', {
                  day: 'numeric', month: 'short', year: 'numeric',
                })}
              </p>
              <p className="text-sm font-semibold text-white">{entry.what_you_did}</p>
              <p className="mt-1 text-sm text-slate-400">{entry.impact}</p>
              {entry.url && (
                <a
                  href={entry.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 block text-xs text-indigo-400 hover:text-indigo-300"
                >
                  {entry.url} ↗
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add components/app/ProgressStrip.tsx components/app/EvidenceLog.tsx
git commit -m "feat: add ProgressStrip and EvidenceLog components"
```

---

## Task 19: Affirmations + GoalCompleteOverlay (install lottie-react)

**Files:**
- Create: `lib/affirmations.ts`
- Create: `components/app/GoalCompleteOverlay.tsx`
- Create: `public/lottie/confetti.json`

- [ ] **Step 1: Install lottie-react**

```bash
npm install lottie-react
```

- [ ] **Step 2: Download a confetti Lottie animation**

```bash
mkdir -p public/lottie
curl -L "https://assets10.lottiefiles.com/packages/lf20_jR229R.json" -o public/lottie/confetti.json
```

If that URL is unavailable, search lottiefiles.com for a free "confetti" animation and download its JSON to `public/lottie/confetti.json`. The file must be valid Lottie JSON (open it and confirm it starts with `{"v":`).

- [ ] **Step 3: Create lib/affirmations.ts**

```typescript
import type { Pillar } from '@/lib/skills'

const AFFIRMATIONS: Record<Pillar, string[]> = {
  self: [
    'Every goal completed is proof that you\'re growing — not just managing.',
    'Self-awareness is a practice. You just practiced it.',
    'The best leaders know themselves first.',
    'Resilience isn\'t built in easy moments. You chose the harder path.',
    'Knowing your edges is the first step to expanding them.',
    'Great managers are made, not born. You\'re proof.',
  ],
  team: [
    'A team that grows around you is the best evidence of great management.',
    'Every coaching conversation you had moved someone forward.',
    'The best thing a manager can do is make themselves less necessary.',
    'You invested in your team. That compounds.',
    'Psychological safety starts with one person deciding it matters — that was you.',
    'Leadership at its best is invisible. Yours is showing.',
  ],
  strategy: [
    'Vision without execution is a dream. You\'re building both.',
    'Clarity is a gift you give your team. You just gave it.',
    'Strategy is choosing what not to do. You\'re getting better at that.',
    'The leaders who last are the ones who think before they act.',
    'You just made the future a little more concrete for your team.',
    'Change is hard to lead. You led it anyway.',
  ],
  communications: [
    'The best communicators make others feel heard. You\'re practising that.',
    'Difficult conversations are how trust gets built. You showed up for one.',
    'Listening is a skill most people think they have. You\'re earning it.',
    'Stories move people. Facts inform them. You\'re learning the difference.',
    'Feedback given well is a gift. You gave one.',
    'Honest communication is rare. Keep making it your default.',
  ],
  'domain-expertise': [
    'Deep expertise wielded with humility is a rare and powerful combination.',
    'The best experts know what they don\'t know — and keep going anyway.',
    'Mastery is a direction, not a destination.',
    'You just raised the bar — for yourself and everyone watching.',
    'Technical excellence in service of others is leadership in disguise.',
    'Your domain knowledge makes your team better. That\'s not a small thing.',
  ],
}

export function getAffirmation(pillar: Pillar, completedCount: number): string {
  const list = AFFIRMATIONS[pillar]
  return list[completedCount % list.length]
}
```

- [ ] **Step 4: Create GoalCompleteOverlay**

```typescript
'use client'

import { useEffect, useRef } from 'react'
import Lottie from 'lottie-react'
import Link from 'next/link'
import { getAffirmation } from '@/lib/affirmations'
import { markGoalCompleteAction } from '@/app/(app)/growth/actions'
import type { Pillar } from '@/lib/skills'
import confettiData from '@/public/lottie/confetti.json'

interface GoalCompleteOverlayProps {
  planId: string
  skillLabel: string
  pillar: Pillar
  completedCount: number
  createdAt: string
  evidenceCount: number
  onDismiss: () => void
}

export function GoalCompleteOverlay({
  planId,
  skillLabel,
  pillar,
  completedCount,
  createdAt,
  evidenceCount,
  onDismiss,
}: GoalCompleteOverlayProps) {
  const triggered = useRef(false)

  useEffect(() => {
    if (triggered.current) return
    triggered.current = true
    markGoalCompleteAction(planId).catch(console.error)
  }, [planId])

  const affirmation = getAffirmation(pillar, completedCount)
  const monthsElapsed = Math.round(
    (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24 * 30)
  )

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-900/95 px-6 text-center">
      <div className="pointer-events-none absolute inset-0">
        <Lottie animationData={confettiData} loop={false} />
      </div>

      <div className="relative z-10 flex max-w-md flex-col items-center gap-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-amber-400">
          Goal complete
        </p>
        <h2 className="text-3xl font-bold text-white">
          {skillLabel} — <span className="text-amber-400">achieved.</span>
        </h2>
        <p className="text-sm text-slate-300">{affirmation}</p>
        <p className="text-xs text-slate-500">
          {monthsElapsed > 0 ? `${monthsElapsed} month${monthsElapsed > 1 ? 's' : ''}` : 'Less than a month'} ·{' '}
          {evidenceCount} evidence {evidenceCount === 1 ? 'entry' : 'entries'}
        </p>

        <div className="mt-4 flex gap-3">
          <Link
            href="/growth"
            onClick={onDismiss}
            className="rounded-lg bg-amber-500 px-5 py-2 text-sm font-semibold text-white hover:bg-amber-400"
          >
            View completed goals →
          </Link>
          <button
            onClick={onDismiss}
            className="rounded-lg border border-slate-600 px-5 py-2 text-sm text-slate-300 hover:text-white"
          >
            Back to Growth
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add lib/affirmations.ts components/app/GoalCompleteOverlay.tsx public/lottie/confetti.json package.json package-lock.json
git commit -m "feat: add affirmations, GoalCompleteOverlay with Lottie celebration"
```

---

## Task 20: Goal Detail page

**Files:**
- Create: `app/(app)/growth/goal/[id]/page.tsx`

- [ ] **Step 1: Create the goal detail page**

```typescript
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getPlanById } from '@/lib/db/development-plans'
import { getGoalResources } from '@/lib/db/goal-resources'
import { getEvidenceForPlan } from '@/lib/db/goal-evidence'
import { getResourcesForSkill } from '@/lib/db/resources'
import { SKILLS, PILLAR_LABELS, type Pillar } from '@/lib/skills'
import { getPlansForUser } from '@/lib/db/development-plans'
import { ProgressStrip } from '@/components/app/ProgressStrip'
import { EvidenceLog } from '@/components/app/EvidenceLog'
import { GoalDetailClient } from '@/components/app/GoalDetailClient'

interface GoalDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function GoalDetailPage({ params }: GoalDetailPageProps) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const plan = await getPlanById(id)
  if (!plan || plan.user_id !== user.id) notFound()

  const skill = SKILLS.find(s => s.key === plan.skill_key)

  const [goalResources, evidence, skillResources, allPlans] = await Promise.all([
    getGoalResources(plan.id),
    getEvidenceForPlan(plan.id),
    skill ? getResourcesForSkill(skill.key) : Promise.resolve([]),
    getPlansForUser(user.id),
  ])

  const completedCount = allPlans.filter(p => p.status === 'completed').length
  const pinnedResourceIds = new Set(goalResources.map(gr => gr.resource_id))

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white">{skill?.label ?? plan.skill_key}</h1>
            <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-semibold text-amber-400">
              {PILLAR_LABELS[plan.pillar as Pillar] ?? plan.pillar}
            </span>
            <span
              className="rounded-full px-2 py-0.5 text-xs font-semibold"
              style={
                plan.status === 'completed'
                  ? { background: 'rgba(74,222,128,0.15)', color: '#4ade80' }
                  : { background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }
              }
            >
              {plan.status === 'completed' ? '✓ Complete' : '🎯 Active'}
            </span>
          </div>
          <p className="mt-2 text-sm text-slate-300">{plan.goal}</p>
        </div>

        {plan.status !== 'completed' && (
          <GoalDetailClient
            plan={plan}
            skillLabel={skill?.label ?? plan.skill_key}
            pillar={(skill?.pillar ?? 'self') as Pillar}
            completedCount={completedCount}
            evidenceCount={evidence.length}
            skillResources={skillResources}
            goalResources={goalResources}
          />
        )}
      </div>

      {/* Progress strip */}
      <ProgressStrip plan={plan} />

      {/* Saved resources */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-white">
          Saved resources
          <span className="ml-2 text-xs font-normal text-slate-500">
            {goalResources.length} pinned
          </span>
        </h3>
        {goalResources.length === 0 ? (
          <p className="text-sm text-slate-500">No resources saved yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {goalResources.map(gr => (
              <div
                key={gr.id}
                className="flex items-start gap-3 rounded-lg bg-slate-800 px-4 py-3"
              >
                <span className="mt-0.5 text-xs font-semibold uppercase text-slate-500">
                  {gr.resource.resource_type}
                </span>
                <div className="flex-1">
                  <a
                    href={gr.resource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-white hover:text-amber-300"
                  >
                    {gr.resource.title} ↗
                  </a>
                  <p className="text-xs text-slate-500">{gr.resource.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Evidence log */}
      <EvidenceLog planId={plan.id} entries={evidence} />
    </div>
  )
}
```

- [ ] **Step 2: Create GoalDetailClient (handles "Mark complete" + resource management)**

```typescript
// components/app/GoalDetailClient.tsx
'use client'

import { useState } from 'react'
import { GoalCompleteOverlay } from './GoalCompleteOverlay'
import { ResourceRow } from './ResourceRow'
import { addGoalResourceAction, removeGoalResourceAction } from '@/app/(app)/growth/actions'
import type { DevelopmentPlan } from '@/lib/db/development-plans'
import type { Resource } from '@/lib/db/resources'
import type { GoalResource } from '@/lib/db/goal-resources'
import type { Pillar } from '@/lib/skills'

interface GoalDetailClientProps {
  plan: DevelopmentPlan
  skillLabel: string
  pillar: Pillar
  completedCount: number
  evidenceCount: number
  skillResources: Resource[]
  goalResources: GoalResource[]
}

export function GoalDetailClient({
  plan,
  skillLabel,
  pillar,
  completedCount,
  evidenceCount,
  skillResources,
  goalResources,
}: GoalDetailClientProps) {
  const [showCelebration, setShowCelebration] = useState(false)
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(
    new Set(goalResources.map(gr => gr.resource_id))
  )
  const [showBrowse, setShowBrowse] = useState(false)

  async function toggleResource(resourceId: string) {
    const next = new Set(pinnedIds)
    if (next.has(resourceId)) {
      next.delete(resourceId)
      setPinnedIds(next)
      await removeGoalResourceAction(plan.id, resourceId)
    } else {
      next.add(resourceId)
      setPinnedIds(next)
      await addGoalResourceAction(plan.id, resourceId)
    }
  }

  return (
    <>
      {showCelebration && (
        <GoalCompleteOverlay
          planId={plan.id}
          skillLabel={skillLabel}
          pillar={pillar}
          completedCount={completedCount}
          createdAt={plan.created_at}
          evidenceCount={evidenceCount}
          onDismiss={() => setShowCelebration(false)}
        />
      )}

      <div className="flex flex-col gap-2">
        <button
          onClick={() => setShowCelebration(true)}
          className="rounded-lg border border-green-500/40 px-4 py-2 text-sm font-semibold text-green-400 hover:border-green-400 hover:bg-green-500/10"
        >
          Mark complete ✓
        </button>

        <button
          onClick={() => setShowBrowse(v => !v)}
          className="text-xs text-slate-500 hover:text-slate-300"
        >
          Browse all resources
        </button>
      </div>

      {showBrowse && skillResources.length > 0 && (
        <div className="col-span-full mt-4 rounded-xl border border-slate-700 bg-slate-800/50 p-4">
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Browse all resources
          </h4>
          <div className="flex flex-col gap-1">
            {skillResources.map(r => (
              <ResourceRow
                key={r.id}
                resource={r}
                added={pinnedIds.has(r.id)}
                onToggle={toggleResource}
              />
            ))}
          </div>
        </div>
      )}
    </>
  )
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add app/(app)/growth/goal/[id]/page.tsx components/app/GoalDetailClient.tsx
git commit -m "feat: add goal detail page with progress, evidence, and completion flow"
```

---

## Task 21: Dashboard check-in nudge

**Files:**
- Create: `components/app/CheckInNudgeCard.tsx`
- Modify: `app/(app)/dashboard/page.tsx`

- [ ] **Step 1: Create CheckInNudgeCard**

```typescript
// components/app/CheckInNudgeCard.tsx
import Link from 'next/link'

interface CheckInNudgeCardProps {
  overdueCount: number
}

export function CheckInNudgeCard({ overdueCount }: CheckInNudgeCardProps) {
  if (overdueCount === 0) return null

  return (
    <div
      className="rounded-xl px-5 py-4"
      style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)' }}
    >
      <p className="mb-1 text-sm font-semibold text-amber-400">
        {overdueCount} check-in{overdueCount > 1 ? 's' : ''} overdue
      </p>
      <p className="mb-2 text-xs text-slate-400">
        Log your progress to keep your goals on track.
      </p>
      <Link
        href="/growth"
        className="text-xs font-semibold text-amber-400 hover:text-amber-300"
      >
        Go to Growth →
      </Link>
    </div>
  )
}
```

- [ ] **Step 2: Update dashboard/page.tsx to compute overdue count and pass to component**

In `app/(app)/dashboard/page.tsx`, after the `plans` data is fetched, add the overdue count computation. Find the existing parallel fetch:

```typescript
// EXISTING:
const [scores, managerScores, plans, scheduled, inProgress] = await Promise.all([...])
```

After that line, add:

```typescript
const overdueCheckins = plans.filter(p => {
  if (p.status === 'completed' || !p.checkin_frequency_weeks) return false
  const base = p.last_checkin_at ? new Date(p.last_checkin_at) : new Date(p.created_at)
  const nextDue = new Date(base.getTime() + p.checkin_frequency_weeks * 7 * 24 * 60 * 60 * 1000)
  return nextDue < new Date()
})
```

Then add the import at the top:

```typescript
import { CheckInNudgeCard } from '@/components/app/CheckInNudgeCard'
```

And in the JSX, inside the right aside, add `<CheckInNudgeCard>` after `<GrowthSummaryCard>`:

```typescript
<GrowthSummaryCard plans={plans} />
<CheckInNudgeCard overdueCount={overdueCheckins.length} />
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Run the full test suite**

```bash
npm test
```
Expected: all existing tests pass, plus the new tests from Tasks 10 and 13.

- [ ] **Step 5: Commit**

```bash
git add components/app/CheckInNudgeCard.tsx app/(app)/dashboard/page.tsx
git commit -m "feat: add check-in nudge to dashboard for overdue goals"
```

---

## Self-Review Checklist

Run through these before marking the feature complete:

### Spec coverage
- [x] Growth page redesign (active goals + opportunities + skills table) — Tasks 11–14
- [x] Resource library schema — Tasks 1–2
- [x] Public Resources page DB-driven — Task 9
- [x] Seeding script — Task 8
- [x] Add Goal screen with resource panel — Tasks 16–17
- [x] Goal Detail page (progress, evidence, resources) — Tasks 18–20
- [x] Goal completion celebration — Task 19
- [x] Check-in frequency on plans — Tasks 3–4
- [x] Dashboard check-in nudge — Task 21

### Type consistency
- `DevelopmentPlan` (Task 4) adds `checkin_frequency_weeks: number | null` and `last_checkin_at: string | null` — used consistently in `getCheckinChip` (Task 10), `ActiveGoalsPanel` (Task 11), `ProgressStrip` (Task 18), dashboard (Task 21)
- `saveGoalAction` passes `checkin_frequency_weeks` as a parsed int — consistent with DB column type `int`
- `GoalDetailClient` imports `GoalResource` from `lib/db/goal-resources` — consistent with the joined type defined there
- `SkillRow.status` is `'opportunity' | 'goal' | null` — matches what `SkillsTable` renders

### Boundary checks
- `getPlanById` returns `null` on error — goal detail page calls `notFound()` on null
- `bulkAddGoalResources` is a no-op for empty arrays — safe to call unconditionally
- `addGoalResource` ignores duplicate (23505) errors — safe for optimistic UI
