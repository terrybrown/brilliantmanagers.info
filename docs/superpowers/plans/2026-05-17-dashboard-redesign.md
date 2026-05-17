# Dashboard Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the narrow-column dashboard with a full-width Mission Control layout (radar + pillar accordion + action cards), retire the Results page, and add a reflection-scheduling widget with ICS export.

**Architecture:** The dashboard page becomes a server component that parallel-fetches all data (round, scores, manager scores, plans, scheduled round, previous round) and renders a three-column CSS grid (220px · 1fr · 260px). Pure utility functions (`lib/countdown.ts`, `lib/ical.ts`) keep scheduling logic unit-testable. All new client interactivity lives in isolated client components (`SkillChip`, `RadarWithToggle`, `PillarAccordion`, `ScheduleWidget`, `GrowthSummaryCard`). The `scheduled_rounds` table (one row per user, unique constraint) is the only schema addition.

**Tech Stack:** Next.js 15 App Router, Supabase SSR, Tailwind CSS, lucide-react (Lightbulb + Target icons, strokeWidth 1.75), recharts (via existing ScorecardRadarChart), Vitest + @testing-library/react, TypeScript.

**Branch:** `feat/dashboard-redesign`

---

## File Map

**Create:**
- `supabase/migrations/003_scheduled_rounds.sql`
- `lib/countdown.ts`
- `lib/ical.ts`
- `lib/db/scheduled-rounds.ts`
- `app/(app)/dashboard/actions.ts`
- `components/app/SkillChip.tsx`
- `components/app/RadarWithToggle.tsx`
- `components/app/PillarAccordion.tsx`
- `components/app/ScheduleWidget.tsx`
- `components/app/GrowthSummaryCard.tsx`
- `app/api/export-ical/route.ts`
- `lib/__tests__/countdown.test.ts`
- `lib/__tests__/ical.test.ts`
- `components/app/__tests__/SkillChip.test.tsx`
- `components/app/__tests__/PillarAccordion.test.tsx`
- `components/app/__tests__/ScheduleWidget.test.tsx`

**Modify:**
- `lib/db/rounds.ts` — add `getInProgressRound`, `getPreviousCompleteRound`
- `components/app/Sidebar.tsx` — update NAV_ITEMS (remove Scorecard/Results, add Connections, reorder)
- `app/(app)/dashboard/page.tsx` — full rewrite: 3-col grid, empty/populated states
- `app/(app)/results/page.tsx` — replace with `redirect('/dashboard')`
- `app/(app)/scorecard/page.tsx` — update `/results` link → `/dashboard`
- `app/(app)/growth/page.tsx` — `max-w-2xl` → `max-w-5xl`
- `app/(app)/connections/page.tsx` — `max-w-2xl` → `max-w-5xl`
- `app/(app)/profile/page.tsx` — `max-w-2xl` → `max-w-5xl`
- `app/(app)/organisation/page.tsx` — `max-w-2xl` → `max-w-5xl`
- `app/(app)/scorecard/page.tsx` — `max-w-2xl` → `max-w-5xl`
- `app/(app)/notifications/page.tsx` — `max-w-2xl` → `max-w-5xl`
- `app/(app)/manager/[userId]/page.tsx` — `max-w-2xl` → `max-w-5xl`

---

## Task 1: DB Schema Migration

**Files:**
- Create: `supabase/migrations/003_scheduled_rounds.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- supabase/migrations/003_scheduled_rounds.sql
create table public.scheduled_rounds (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles(id) on delete cascade,
  scheduled_date date not null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (user_id)
);

alter table public.scheduled_rounds enable row level security;

create policy "Users manage own scheduled rounds"
  on public.scheduled_rounds
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

- [ ] **Step 2: Apply via Supabase dashboard**

Navigate to Supabase project → SQL Editor → paste the migration → Run.

Verify the table exists:
```sql
select count(*) from public.scheduled_rounds;
-- should return 0 (empty table)
```

Verify RLS blocks unauthenticated access (replace with your actual values):
```bash
SUPABASE_URL="https://jxanausntacmzgnzzncu.supabase.co"
ANON_KEY="$NEXT_PUBLIC_SUPABASE_ANON_KEY"
curl -s -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY" \
  "$SUPABASE_URL/rest/v1/scheduled_rounds?select=*"
# Must return []
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/003_scheduled_rounds.sql
git commit -m "feat: add scheduled_rounds table with RLS"
```

---

## Task 2: Pure Utility Libraries + Tests

**Files:**
- Create: `lib/countdown.ts`
- Create: `lib/ical.ts`
- Create: `lib/__tests__/countdown.test.ts`
- Create: `lib/__tests__/ical.test.ts`

- [ ] **Step 1: Write the failing countdown tests**

```typescript
// lib/__tests__/countdown.test.ts
import { describe, it, expect } from 'vitest'
import { daysUntil, countdownLabel, googleCalendarUrl } from '../countdown'

describe('daysUntil', () => {
  it('returns 0 for today', () => {
    const today = new Date().toISOString().slice(0, 10)
    expect(daysUntil(today)).toBe(0)
  })

  it('returns 1 for tomorrow', () => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    expect(daysUntil(d.toISOString().slice(0, 10))).toBe(1)
  })

  it('returns negative for a past date', () => {
    expect(daysUntil('2020-01-01')).toBeLessThan(0)
  })

  it('returns 30 for a date 30 days away', () => {
    const d = new Date()
    d.setDate(d.getDate() + 30)
    expect(daysUntil(d.toISOString().slice(0, 10))).toBe(30)
  })
})

describe('countdownLabel', () => {
  it.each([
    [-1, 'overdue'],
    [0, 'today'],
    [1, 'tomorrow'],
    [5, 'in 5 days'],
    [30, 'in 30 days'],
  ])('days=%i → "%s"', (days, label) => {
    expect(countdownLabel(days)).toBe(label)
  })
})

describe('googleCalendarUrl', () => {
  it('encodes start date and next day correctly', () => {
    const url = googleCalendarUrl('2025-06-15')
    expect(url).toContain('dates=20250615/20250616')
  })

  it('includes the expected title text', () => {
    const url = googleCalendarUrl('2025-06-15')
    expect(url).toContain('text=Brilliant+Managers+Reflection+Round')
  })

  it('handles month boundary correctly', () => {
    const url = googleCalendarUrl('2025-01-31')
    expect(url).toContain('dates=20250131/20250201')
  })
})
```

- [ ] **Step 2: Run countdown tests to verify they fail**

```bash
npx vitest run lib/__tests__/countdown.test.ts
```

Expected: FAIL — `Cannot find module '../countdown'`

- [ ] **Step 3: Implement lib/countdown.ts**

```typescript
// lib/countdown.ts
export function daysUntil(dateStr: string): number {
  const target = new Date(dateStr + 'T00:00:00')
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

export function countdownLabel(days: number): string {
  if (days < 0) return 'overdue'
  if (days === 0) return 'today'
  if (days === 1) return 'tomorrow'
  return `in ${days} days`
}

export function googleCalendarUrl(dateStr: string): string {
  const start = dateStr.replace(/-/g, '')
  const next = new Date(dateStr + 'T00:00:00')
  next.setDate(next.getDate() + 1)
  const end = next.toISOString().slice(0, 10).replace(/-/g, '')
  return (
    'https://calendar.google.com/calendar/render?action=TEMPLATE' +
    `&text=Brilliant+Managers+Reflection+Round` +
    `&dates=${start}/${end}` +
    `&details=Time+to+reflect+on+your+management+skills`
  )
}
```

- [ ] **Step 4: Run countdown tests to verify they pass**

```bash
npx vitest run lib/__tests__/countdown.test.ts
```

Expected: PASS — 7 tests passing

- [ ] **Step 5: Write the failing ICS tests**

```typescript
// lib/__tests__/ical.test.ts
import { describe, it, expect } from 'vitest'
import { generateICS } from '../ical'

describe('generateICS', () => {
  it('returns a VCALENDAR block', () => {
    const ics = generateICS('2025-06-15')
    expect(ics).toContain('BEGIN:VCALENDAR')
    expect(ics).toContain('END:VCALENDAR')
  })

  it('contains a single VEVENT', () => {
    const ics = generateICS('2025-06-15')
    const beginCount = (ics.match(/BEGIN:VEVENT/g) ?? []).length
    expect(beginCount).toBe(1)
  })

  it('uses CRLF line endings throughout', () => {
    const ics = generateICS('2025-06-15')
    // Every line break is CRLF
    expect(ics).toContain('\r\n')
    expect(ics).not.toContain('\n\r')
  })

  it('sets DTSTART as an all-day date', () => {
    const ics = generateICS('2025-06-15')
    expect(ics).toContain('DTSTART;VALUE=DATE:20250615')
  })

  it('sets DTEND to the following day', () => {
    const ics = generateICS('2025-06-15')
    expect(ics).toContain('DTEND;VALUE=DATE:20250616')
  })

  it('handles month boundary for DTEND', () => {
    const ics = generateICS('2025-01-31')
    expect(ics).toContain('DTEND;VALUE=DATE:20250201')
  })

  it('includes a stable UID', () => {
    const ics = generateICS('2025-06-15')
    expect(ics).toContain('UID:reflection-2025-06-15@brilliantmanagers.info')
  })
})
```

- [ ] **Step 6: Run ICS tests to verify they fail**

```bash
npx vitest run lib/__tests__/ical.test.ts
```

Expected: FAIL — `Cannot find module '../ical'`

- [ ] **Step 7: Implement lib/ical.ts**

```typescript
// lib/ical.ts
function toDateStamp(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}${m}${day}`
}

export function generateICS(scheduledDate: string): string {
  const start = new Date(scheduledDate + 'T00:00:00')
  const end = new Date(scheduledDate + 'T00:00:00')
  end.setDate(end.getDate() + 1)

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Brilliant Managers//EN',
    'BEGIN:VEVENT',
    `DTSTART;VALUE=DATE:${toDateStamp(start)}`,
    `DTEND;VALUE=DATE:${toDateStamp(end)}`,
    'SUMMARY:Brilliant Managers Reflection Round',
    'DESCRIPTION:Time to reflect on your management skills',
    `UID:reflection-${scheduledDate}@brilliantmanagers.info`,
    'END:VEVENT',
    'END:VCALENDAR',
  ]
  return lines.join('\r\n')
}
```

- [ ] **Step 8: Run ICS tests to verify they pass**

```bash
npx vitest run lib/__tests__/ical.test.ts
```

Expected: PASS — 7 tests passing

- [ ] **Step 9: Commit**

```bash
git add lib/countdown.ts lib/ical.ts lib/__tests__/countdown.test.ts lib/__tests__/ical.test.ts
git commit -m "feat: add countdown and ICS utility libraries with tests"
```

---

## Task 3: DB Helpers

**Files:**
- Create: `lib/db/scheduled-rounds.ts`
- Modify: `lib/db/rounds.ts`

- [ ] **Step 1: Create lib/db/scheduled-rounds.ts**

```typescript
// lib/db/scheduled-rounds.ts
import { createClient } from '@/lib/supabase/server'

export interface ScheduledRound {
  id: string
  user_id: string
  scheduled_date: string
  created_at: string
  updated_at: string
}

export async function getScheduledRound(userId: string): Promise<ScheduledRound | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('scheduled_rounds')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()
  return data ?? null
}

export async function upsertScheduledRound(userId: string, date: string): Promise<ScheduledRound> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('scheduled_rounds')
    .upsert(
      { user_id: userId, scheduled_date: date, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    )
    .select()
    .single()
  if (error) throw error
  return data as ScheduledRound
}

export async function deleteScheduledRound(userId: string): Promise<void> {
  const supabase = await createClient()
  await supabase.from('scheduled_rounds').delete().eq('user_id', userId)
}
```

- [ ] **Step 2: Add helpers to lib/db/rounds.ts**

Add these two functions after `maybeCompleteRound` in the existing file:

```typescript
export async function getInProgressRound(userId: string): Promise<Round | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('assessment_rounds')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'in_progress')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data as Round | null
}

export async function getPreviousCompleteRound(
  userId: string,
  beforeCompletedAt: string
): Promise<Round | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('assessment_rounds')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'complete')
    .lt('completed_at', beforeCompletedAt)
    .order('completed_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data as Round | null
}
```

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | grep -v "node_modules" | head -30
```

Expected: no new errors

- [ ] **Step 4: Commit**

```bash
git add lib/db/scheduled-rounds.ts lib/db/rounds.ts
git commit -m "feat: add scheduled-rounds helpers and round query utilities"
```

---

## Task 4: Dashboard Server Actions

**Files:**
- Create: `app/(app)/dashboard/actions.ts`

- [ ] **Step 1: Create the actions file**

```typescript
// app/(app)/dashboard/actions.ts
'use server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { upsertScheduledRound, deleteScheduledRound } from '@/lib/db/scheduled-rounds'

export async function setScheduledRoundAction(formData: FormData): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const date = formData.get('scheduled_date') as string
  if (!date) return

  await upsertScheduledRound(user.id, date)
  revalidatePath('/dashboard')
}

export async function cancelScheduledRoundAction(): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  await deleteScheduledRound(user.id)
  revalidatePath('/dashboard')
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | grep -v "node_modules" | head -20
```

Expected: no new errors

- [ ] **Step 3: Commit**

```bash
git add app/\(app\)/dashboard/actions.ts
git commit -m "feat: add dashboard server actions for scheduling"
```

---

## Task 5: Sidebar Nav Update

**Files:**
- Modify: `components/app/Sidebar.tsx`

- [ ] **Step 1: Update NAV_ITEMS and imports**

Replace the existing `NAV_ITEMS` constant and the import from lucide-react. The full file becomes:

```typescript
// components/app/Sidebar.tsx
'use client'
import {
  LayoutDashboard,
  TrendingUp,
  Link2,
  Network,
} from 'lucide-react'
import { LogoMark } from './LogoMark'
import { NavItem } from './NavItem'

const NAV_ITEMS = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/growth', icon: TrendingUp, label: 'Growth' },
  { href: '/connections', icon: Link2, label: 'Connections' },
  { href: '/organisation', icon: Network, label: 'Organisation' },
] as const

interface SidebarProps {
  isExpanded: boolean
  onToggle: () => void
}

export function Sidebar({ isExpanded, onToggle }: SidebarProps) {
  return (
    <div
      style={{
        width: isExpanded ? 220 : 56,
        background: '#111827',
        borderRight: '1px solid #1f2937',
        display: 'flex',
        flexDirection: 'column',
        alignItems: isExpanded ? 'flex-start' : 'center',
        padding: isExpanded ? '12px 8px' : '12px 0',
        gap: 4,
        flexShrink: 0,
        position: 'relative',
        transition: 'width 0.2s ease',
        overflow: 'hidden',
      }}
    >
      {/* Logo */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 12,
          flexShrink: 0,
          padding: isExpanded ? '0 4px' : 0,
          width: isExpanded ? '100%' : 40,
          justifyContent: isExpanded ? 'flex-start' : 'center',
        }}
      >
        <LogoMark size={32} />
        {isExpanded && (
          <span
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: '#f8fafc',
              whiteSpace: 'nowrap',
              letterSpacing: '-0.3px',
            }}
          >
            Brilliant Managers
          </span>
        )}
      </div>

      {/* Nav */}
      {NAV_ITEMS.map(item => (
        <NavItem
          key={item.href}
          href={item.href}
          icon={item.icon}
          label={item.label}
          isExpanded={isExpanded}
        />
      ))}

      <div style={{ flex: 1 }} />

      {/* Toggle button */}
      <button
        onClick={onToggle}
        aria-label={isExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
        style={{
          position: 'absolute',
          right: -10,
          top: '50%',
          transform: 'translateY(-50%)',
          width: 20,
          height: 20,
          background: '#1f2937',
          border: '1px solid #334155',
          borderRadius: '50%',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 10,
          color: '#64748b',
          zIndex: 10,
        }}
      >
        {isExpanded ? '‹' : '›'}
      </button>
    </div>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | grep -v "node_modules" | head -20
```

Expected: no new errors

- [ ] **Step 3: Commit**

```bash
git add components/app/Sidebar.tsx
git commit -m "feat: update sidebar nav — Dashboard/Growth/Connections/Organisation"
```

---

## Task 6: Page Width Changes

**Files:**
- Modify 8 pages: growth, connections, profile, organisation, scorecard, notifications, manager/[userId]

- [ ] **Step 1: Update growth page**

In `app/(app)/growth/page.tsx`, change:
```
className="mx-auto max-w-2xl"
```
to:
```
className="mx-auto max-w-5xl"
```

- [ ] **Step 2: Update connections page**

In `app/(app)/connections/page.tsx`, change:
```
className="mx-auto max-w-2xl"
```
to:
```
className="mx-auto max-w-5xl"
```

- [ ] **Step 3: Update profile page**

In `app/(app)/profile/page.tsx`, change:
```
className="mx-auto max-w-2xl"
```
to:
```
className="mx-auto max-w-5xl"
```

- [ ] **Step 4: Update organisation page**

In `app/(app)/organisation/page.tsx`, change:
```
className="mx-auto max-w-2xl"
```
to:
```
className="mx-auto max-w-5xl"
```

- [ ] **Step 5: Update scorecard page**

In `app/(app)/scorecard/page.tsx`, change:
```
className="mx-auto max-w-2xl"
```
to:
```
className="mx-auto max-w-5xl"
```

- [ ] **Step 6: Update notifications page**

In `app/(app)/notifications/page.tsx`, change:
```
className="mx-auto max-w-2xl"
```
to:
```
className="mx-auto max-w-5xl"
```

- [ ] **Step 7: Update manager/[userId] page**

In `app/(app)/manager/[userId]/page.tsx`, change:
```
className="mx-auto max-w-2xl"
```
to:
```
className="mx-auto max-w-5xl"
```
(This appears in the pillar list return — line 62 in the current file.)

- [ ] **Step 8: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | grep -v "node_modules" | head -20
```

Expected: no new errors

- [ ] **Step 9: Commit**

```bash
git add app/\(app\)/growth/page.tsx app/\(app\)/connections/page.tsx \
  app/\(app\)/profile/page.tsx app/\(app\)/organisation/page.tsx \
  app/\(app\)/scorecard/page.tsx app/\(app\)/notifications/page.tsx \
  app/\(app\)/manager/\[userId\]/page.tsx
git commit -m "feat: widen all non-dashboard pages to max-w-5xl"
```

---

## Task 7: SkillChip Component + Tests

**Files:**
- Create: `components/app/SkillChip.tsx`
- Create: `components/app/__tests__/SkillChip.test.tsx`

- [ ] **Step 1: Write the failing tests**

```typescript
// components/app/__tests__/SkillChip.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SkillChip } from '../SkillChip'

describe('SkillChip', () => {
  it('renders the label for an opportunity chip', () => {
    render(<SkillChip type="opportunity" label="Resilience" />)
    expect(screen.getByText('Resilience')).toBeInTheDocument()
  })

  it('renders the label for a goal chip', () => {
    render(<SkillChip type="goal" label="Emotional Intelligence" />)
    expect(screen.getByText('Emotional Intelligence')).toBeInTheDocument()
  })

  it('applies indigo colour for opportunity', () => {
    const { container } = render(<SkillChip type="opportunity" label="Test" />)
    const chip = container.firstChild as HTMLElement
    expect(chip.style.color).toBe('rgb(165, 180, 252)')
  })

  it('applies amber colour for goal', () => {
    const { container } = render(<SkillChip type="goal" label="Test" />)
    const chip = container.firstChild as HTMLElement
    expect(chip.style.color).toBe('rgb(245, 158, 11)')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run components/app/__tests__/SkillChip.test.tsx
```

Expected: FAIL — `Cannot find module '../SkillChip'`

- [ ] **Step 3: Implement SkillChip.tsx**

```typescript
// components/app/SkillChip.tsx
'use client'
import { Lightbulb, Target } from 'lucide-react'

const STYLES = {
  opportunity: {
    background: 'rgba(99,102,241,0.12)',
    border: '1px solid rgba(99,102,241,0.35)',
    color: '#a5b4fc',
  },
  goal: {
    background: 'rgba(245,158,11,0.12)',
    border: '1px solid rgba(245,158,11,0.35)',
    color: '#f59e0b',
  },
}

interface SkillChipProps {
  type: 'opportunity' | 'goal'
  label: string
  size?: 'sm' | 'md'
}

export function SkillChip({ type, label, size = 'sm' }: SkillChipProps) {
  const Icon = type === 'opportunity' ? Lightbulb : Target
  const iconSize = size === 'md' ? 14 : 12
  return (
    <span
      style={STYLES[type]}
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${size === 'md' ? 'text-sm' : 'text-xs'}`}
    >
      <Icon size={iconSize} strokeWidth={1.75} />
      {label}
    </span>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run components/app/__tests__/SkillChip.test.tsx
```

Expected: PASS — 4 tests passing

- [ ] **Step 5: Commit**

```bash
git add components/app/SkillChip.tsx components/app/__tests__/SkillChip.test.tsx
git commit -m "feat: add SkillChip component with opportunity/goal variants"
```

---

## Task 8: RadarWithToggle Component

**Files:**
- Create: `components/app/RadarWithToggle.tsx`

No new tests needed — this is a thin client wrapper around the already-tested `ScorecardRadarChart`.

- [ ] **Step 1: Create RadarWithToggle.tsx**

```typescript
// components/app/RadarWithToggle.tsx
'use client'
import { useState } from 'react'
import { ScorecardRadarChart } from '@/components/app/ScorecardRadarChart'
import type { Pillar } from '@/lib/skills'

interface PillarScore {
  pillar: Pillar
  selfScore: number
  managerScore?: number
}

interface RadarWithToggleProps {
  pillarScores: PillarScore[]
  hasManagerScores: boolean
}

export function RadarWithToggle({ pillarScores, hasManagerScores }: RadarWithToggleProps) {
  const [showManager, setShowManager] = useState(false)

  return (
    <div>
      {hasManagerScores && (
        <div className="mb-2 flex gap-2">
          <button
            onClick={() => setShowManager(false)}
            className={`rounded px-2 py-0.5 text-xs font-medium ${
              !showManager ? 'bg-amber-500 text-white' : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            Self
          </button>
          <button
            onClick={() => setShowManager(true)}
            className={`rounded px-2 py-0.5 text-xs font-medium ${
              showManager ? 'bg-amber-500 text-white' : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            Manager
          </button>
        </div>
      )}
      <div style={{ height: 200 }}>
        <ScorecardRadarChart pillarScores={pillarScores} showManager={showManager} />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | grep -v "node_modules" | head -20
```

Expected: no new errors

- [ ] **Step 3: Commit**

```bash
git add components/app/RadarWithToggle.tsx
git commit -m "feat: add RadarWithToggle client wrapper with Self/Manager toggle"
```

---

## Task 9: PillarAccordion Component + Tests

**Files:**
- Create: `components/app/PillarAccordion.tsx`
- Create: `components/app/__tests__/PillarAccordion.test.tsx`

- [ ] **Step 1: Write the failing tests**

```typescript
// components/app/__tests__/PillarAccordion.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PillarAccordion } from '../PillarAccordion'
import type { PillarData } from '../PillarAccordion'

const PILLARS: PillarData[] = [
  {
    pillar: 'self',
    label: 'Self',
    score: 2.2,
    isLowest: true,
    skills: [
      {
        key: 'self-resilience',
        name: 'Resilience',
        description: 'How consistently you maintain your effectiveness under pressure.',
        level: 'Basic',
        score: 2,
        chipType: 'opportunity',
        goalText: undefined,
      },
      {
        key: 'self-growth-mindset',
        name: 'Growth Mindset',
        description: 'Whether you actively seek challenge and learning.',
        level: 'Proficient',
        score: 3,
        chipType: null,
        goalText: undefined,
      },
    ],
  },
  {
    pillar: 'team',
    label: 'Team',
    score: 3.5,
    isLowest: false,
    skills: [
      {
        key: 'team-coaching-mentoring',
        name: 'Coaching & Mentoring',
        description: 'Your ability to develop others.',
        level: 'Proficient',
        score: 3,
        chipType: 'goal',
        goalText: 'Run fortnightly coaching conversations with each direct report',
      },
    ],
  },
]

describe('PillarAccordion', () => {
  it('renders all pillar labels', () => {
    render(<PillarAccordion pillars={PILLARS} />)
    expect(screen.getByText('Self')).toBeInTheDocument()
    expect(screen.getByText('Team')).toBeInTheDocument()
  })

  it('renders opportunity chip for a Basic skill', () => {
    render(<PillarAccordion pillars={PILLARS} />)
    expect(screen.getByText('Resilience')).toBeInTheDocument()
  })

  it('renders goal chip for a skill with a goal', () => {
    render(<PillarAccordion pillars={PILLARS} />)
    expect(screen.getByText('Coaching & Mentoring')).toBeInTheDocument()
  })

  it('expands a pillar on header click to show Opportunities section', () => {
    render(<PillarAccordion pillars={PILLARS} />)
    fireEvent.click(screen.getByRole('button', { name: /self/i }))
    expect(screen.getByText('Opportunities')).toBeInTheDocument()
  })

  it('collapses the first pillar when the second is clicked', () => {
    render(<PillarAccordion pillars={PILLARS} />)
    fireEvent.click(screen.getByRole('button', { name: /self/i }))
    expect(screen.getByText('Opportunities')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /team/i }))
    expect(screen.queryByText('Opportunities')).not.toBeInTheDocument()
  })

  it('shows "↓ lowest" badge on the lowest-scoring pillar', () => {
    render(<PillarAccordion pillars={PILLARS} />)
    expect(screen.getByText('↓ lowest')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run components/app/__tests__/PillarAccordion.test.tsx
```

Expected: FAIL — `Cannot find module '../PillarAccordion'`

- [ ] **Step 3: Implement PillarAccordion.tsx**

```typescript
// components/app/PillarAccordion.tsx
'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Lightbulb, Target, ChevronDown } from 'lucide-react'
import { SkillChip } from './SkillChip'
import type { Level } from '@/lib/skills'
import { LEVEL_COLORS } from '@/lib/skills'

export interface SkillData {
  key: string
  name: string
  description: string
  level: Level
  score: number
  chipType: 'opportunity' | 'goal' | null
  goalText?: string
}

export interface PillarData {
  pillar: string
  label: string
  score: number
  isLowest: boolean
  skills: SkillData[]
}

interface PillarAccordionProps {
  pillars: PillarData[]
}

export function PillarAccordion({ pillars }: PillarAccordionProps) {
  const [openPillar, setOpenPillar] = useState<string | null>(null)

  return (
    <div className="flex flex-col gap-3">
      {pillars.map(pillar => {
        const isOpen = openPillar === pillar.pillar
        const chipped = pillar.skills.filter(s => s.chipType !== null)
        const opportunities = pillar.skills.filter(s => s.chipType === 'opportunity')
        const goals = pillar.skills.filter(s => s.chipType === 'goal')
        const scoreWidth = `${((pillar.score - 1) / 4) * 100}%`

        return (
          <div
            key={pillar.pillar}
            className="rounded-xl px-4 py-3"
            style={
              pillar.isLowest
                ? { background: '#0f2040', border: '1px solid rgba(245,158,11,0.45)' }
                : { background: '#1e293b', border: '1px solid transparent' }
            }
          >
            {/* Header row */}
            <button
              onClick={() => setOpenPillar(isOpen ? null : pillar.pillar)}
              aria-label={pillar.label}
              className="flex w-full items-center gap-3 text-left"
            >
              <span className="w-28 flex-shrink-0 text-sm font-medium text-white">
                {pillar.label}
              </span>
              {pillar.isLowest && (
                <span className="mr-1 text-xs font-semibold text-amber-400">↓ lowest</span>
              )}
              <div className="flex-1">
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-700">
                  <div
                    className="h-1.5 rounded-full bg-amber-500 transition-all"
                    style={{ width: scoreWidth }}
                  />
                </div>
              </div>
              <span className="w-8 text-right text-xs font-semibold text-amber-400">
                {pillar.score.toFixed(1)}
              </span>
              <ChevronDown
                size={14}
                className={`text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {/* Always-on chips row */}
            {chipped.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {chipped.map(skill => (
                  <SkillChip key={skill.key} type={skill.chipType!} label={skill.name} />
                ))}
              </div>
            )}

            {/* Expanded detail */}
            {isOpen && (
              <div className="mt-4 space-y-4">
                {opportunities.length > 0 && (
                  <section>
                    <div className="mb-2 flex items-center gap-1.5">
                      <Lightbulb size={13} strokeWidth={1.75} style={{ color: '#a5b4fc' }} />
                      <span className="text-xs font-semibold" style={{ color: '#a5b4fc' }}>
                        Opportunities
                      </span>
                    </div>
                    <div className="flex flex-col gap-2">
                      {opportunities.map(skill => (
                        <div key={skill.key} className="flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-white">{skill.name}</p>
                            <p className="mt-0.5 text-xs text-slate-400 leading-relaxed">
                              {skill.description}
                            </p>
                          </div>
                          <span
                            className="flex-shrink-0 rounded px-1.5 py-0.5 text-xs font-medium"
                            style={{
                              background: 'rgba(0,0,0,0.3)',
                              color: LEVEL_COLORS[skill.level],
                            }}
                          >
                            {skill.level}
                          </span>
                          <Link
                            href={`/growth?skill=${skill.key}`}
                            className="flex-shrink-0 rounded px-2 py-0.5 text-xs font-semibold"
                            style={{
                              background: 'rgba(99,102,241,0.15)',
                              color: '#a5b4fc',
                            }}
                          >
                            Make goal →
                          </Link>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {goals.length > 0 && (
                  <section>
                    <div className="mb-2 flex items-center gap-1.5">
                      <Target size={13} strokeWidth={1.75} style={{ color: '#f59e0b' }} />
                      <span className="text-xs font-semibold text-amber-400">Active Goals</span>
                    </div>
                    <div className="flex flex-col gap-2">
                      {goals.map(skill => (
                        <div key={skill.key} className="flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-white">{skill.name}</p>
                            {skill.goalText && (
                              <p className="mt-0.5 truncate text-xs text-slate-400">
                                {skill.goalText}
                              </p>
                            )}
                          </div>
                          <span
                            className="flex-shrink-0 rounded px-1.5 py-0.5 text-xs font-medium"
                            style={{
                              background: 'rgba(0,0,0,0.3)',
                              color: LEVEL_COLORS[skill.level],
                            }}
                          >
                            {skill.level}
                          </span>
                          <Link
                            href="/growth"
                            className="flex-shrink-0 text-xs font-semibold text-amber-400 hover:text-amber-300"
                          >
                            In Growth →
                          </Link>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run components/app/__tests__/PillarAccordion.test.tsx
```

Expected: PASS — 6 tests passing

- [ ] **Step 5: Commit**

```bash
git add components/app/PillarAccordion.tsx components/app/__tests__/PillarAccordion.test.tsx
git commit -m "feat: add PillarAccordion with always-on chips and expand-to-detail behaviour"
```

---

## Task 10: ScheduleWidget Component + Tests

**Files:**
- Create: `components/app/ScheduleWidget.tsx`
- Create: `components/app/__tests__/ScheduleWidget.test.tsx`

- [ ] **Step 1: Write the failing tests**

```typescript
// components/app/__tests__/ScheduleWidget.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ScheduleWidget } from '../ScheduleWidget'
import type { ScheduledRound } from '@/lib/db/scheduled-rounds'

describe('ScheduleWidget', () => {
  it('shows the schedule form when no round is scheduled', () => {
    render(<ScheduleWidget scheduled={null} />)
    expect(screen.getByText(/Schedule your next reflection/i)).toBeInTheDocument()
  })

  it('shows a date input when not scheduled', () => {
    render(<ScheduleWidget scheduled={null} />)
    expect(screen.getByLabelText(/reflection date/i)).toBeInTheDocument()
  })

  it('shows countdown when a future date is scheduled', () => {
    const scheduled: ScheduledRound = {
      id: '1',
      user_id: 'u1',
      scheduled_date: '2099-12-31',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    render(<ScheduleWidget scheduled={scheduled} />)
    expect(screen.getByText(/in \d+ days/i)).toBeInTheDocument()
  })

  it('shows Google Calendar link when scheduled', () => {
    const scheduled: ScheduledRound = {
      id: '1',
      user_id: 'u1',
      scheduled_date: '2099-12-31',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    render(<ScheduleWidget scheduled={scheduled} />)
    expect(screen.getByText(/Add to Google Calendar/i)).toBeInTheDocument()
  })

  it('shows Download .ics link when scheduled', () => {
    const scheduled: ScheduledRound = {
      id: '1',
      user_id: 'u1',
      scheduled_date: '2099-12-31',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    render(<ScheduleWidget scheduled={scheduled} />)
    expect(screen.getByText(/Download \.ics/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run components/app/__tests__/ScheduleWidget.test.tsx
```

Expected: FAIL — `Cannot find module '../ScheduleWidget'`

- [ ] **Step 3: Implement ScheduleWidget.tsx**

```typescript
// components/app/ScheduleWidget.tsx
'use client'
import { useState } from 'react'
import { Pencil, X, Calendar } from 'lucide-react'
import type { ScheduledRound } from '@/lib/db/scheduled-rounds'
import { setScheduledRoundAction, cancelScheduledRoundAction } from '@/app/(app)/dashboard/actions'
import { daysUntil, countdownLabel, googleCalendarUrl } from '@/lib/countdown'

interface ScheduleWidgetProps {
  scheduled: ScheduledRound | null
}

export function ScheduleWidget({ scheduled }: ScheduleWidgetProps) {
  const [editing, setEditing] = useState(false)

  if (!scheduled || editing) {
    return (
      <div className="rounded-xl bg-slate-800 px-5 py-4">
        <h3 className="mb-1 text-sm font-semibold text-white">Schedule your next reflection</h3>
        <p className="mb-3 text-xs text-slate-400">
          Set a date to remind yourself to complete your next round.
        </p>
        <form
          action={async (fd: FormData) => {
            await setScheduledRoundAction(fd)
            setEditing(false)
          }}
          className="flex flex-col gap-2"
        >
          <label htmlFor="scheduled_date" className="sr-only">
            Reflection date
          </label>
          <input
            id="scheduled_date"
            name="scheduled_date"
            type="date"
            required
            defaultValue={scheduled?.scheduled_date ?? ''}
            min={new Date().toISOString().slice(0, 10)}
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-amber-400 focus:outline-none"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 rounded-lg bg-amber-500 py-2 text-xs font-semibold text-white hover:bg-amber-400"
            >
              Set date
            </button>
            {editing && (
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-400"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>
    )
  }

  const days = daysUntil(scheduled.scheduled_date)
  const label = countdownLabel(days)
  const gcalUrl = googleCalendarUrl(scheduled.scheduled_date)

  return (
    <div className="rounded-xl bg-slate-800 px-5 py-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-white">Next reflection</h3>
          <p className="mt-0.5 text-xs text-slate-400">
            {new Date(scheduled.scheduled_date + 'T00:00:00').toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setEditing(true)}
            aria-label="Edit date"
            className="rounded p-1 text-slate-500 hover:text-slate-300"
          >
            <Pencil size={13} />
          </button>
          <form action={cancelScheduledRoundAction}>
            <button
              type="submit"
              aria-label="Cancel scheduled round"
              className="rounded p-1 text-slate-500 hover:text-red-400"
            >
              <X size={13} />
            </button>
          </form>
        </div>
      </div>

      <div
        className="mb-3 flex items-center gap-2 rounded-lg px-3 py-2"
        style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}
      >
        <Calendar size={14} className="text-amber-400" />
        <span className="text-xs font-semibold text-amber-400">{label}</span>
      </div>

      <div className="flex flex-col gap-1.5">
        <a
          href={gcalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-slate-400 hover:text-white"
        >
          Add to Google Calendar →
        </a>
        <a
          href="/api/export-ical"
          className="text-xs text-slate-400 hover:text-white"
        >
          Download .ics →
        </a>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run components/app/__tests__/ScheduleWidget.test.tsx
```

Expected: PASS — 5 tests passing

- [ ] **Step 5: Commit**

```bash
git add components/app/ScheduleWidget.tsx components/app/__tests__/ScheduleWidget.test.tsx
git commit -m "feat: add ScheduleWidget with date form, countdown, and calendar export links"
```

---

## Task 11: GrowthSummaryCard Component

**Files:**
- Create: `components/app/GrowthSummaryCard.tsx`

No separate tests — this is a pure rendering component with no logic beyond array filtering, which is covered by the dashboard integration.

- [ ] **Step 1: Create GrowthSummaryCard.tsx**

```typescript
// components/app/GrowthSummaryCard.tsx
import Link from 'next/link'
import type { DevelopmentPlan } from '@/lib/db/development-plans'
import { PILLARS, SKILLS } from '@/lib/skills'

interface GrowthSummaryCardProps {
  plans: DevelopmentPlan[]
}

export function GrowthSummaryCard({ plans }: GrowthSummaryCardProps) {
  const active = plans.filter(p => p.status === 'planned' || p.status === 'in_progress')

  if (active.length === 0) {
    return (
      <div className="rounded-xl bg-slate-800 px-5 py-4">
        <h3 className="mb-1 text-sm font-semibold text-white">Growth Goals</h3>
        <p className="mb-3 text-xs text-slate-400">No growth goals yet.</p>
        <Link href="/growth" className="text-xs font-semibold text-amber-400 hover:text-amber-300">
          Explore skills →
        </Link>
      </div>
    )
  }

  const sorted = [...active].sort(
    (a, b) =>
      PILLARS.indexOf(a.pillar as (typeof PILLARS)[number]) -
      PILLARS.indexOf(b.pillar as (typeof PILLARS)[number])
  )
  const top2 = sorted.slice(0, 2)

  return (
    <div className="rounded-xl bg-slate-800 px-5 py-4">
      <h3 className="mb-1 text-sm font-semibold text-white">Growth Goals</h3>
      <p className="mb-2 text-xs font-semibold text-amber-400">
        {active.length} active goal{active.length > 1 ? 's' : ''}
      </p>
      <ul className="mb-3 space-y-1">
        {top2.map(p => {
          const skill = SKILLS.find(s => s.key === p.skill_key)
          return (
            <li key={p.skill_key} className="truncate text-xs text-slate-300">
              {skill?.label ?? p.skill_key}
            </li>
          )
        })}
      </ul>
      <Link href="/growth" className="text-xs font-semibold text-amber-400 hover:text-amber-300">
        View all →
      </Link>
    </div>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | grep -v "node_modules" | head -20
```

Expected: no new errors

- [ ] **Step 3: Commit**

```bash
git add components/app/GrowthSummaryCard.tsx
git commit -m "feat: add GrowthSummaryCard showing active goal count and top skill names"
```

---

## Task 12: ICS API Route

**Files:**
- Create: `app/api/export-ical/route.ts`

- [ ] **Step 1: Create the route**

```typescript
// app/api/export-ical/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getScheduledRound } from '@/lib/db/scheduled-rounds'
import { generateICS } from '@/lib/ical'

export async function GET(): Promise<NextResponse> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const scheduled = await getScheduledRound(user.id)
  if (!scheduled) {
    return new NextResponse('No scheduled round found', { status: 404 })
  }

  const ics = generateICS(scheduled.scheduled_date)

  return new NextResponse(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="reflection-round.ics"',
    },
  })
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | grep -v "node_modules" | head -20
```

Expected: no new errors

- [ ] **Step 3: Commit**

```bash
git add app/api/export-ical/route.ts
git commit -m "feat: add /api/export-ical route returning ICS for scheduled round"
```

---

## Task 13: Dashboard Page Rewrite

**Files:**
- Modify: `app/(app)/dashboard/page.tsx`

- [ ] **Step 1: Replace the dashboard page**

The full replacement for `app/(app)/dashboard/page.tsx`:

```typescript
// app/(app)/dashboard/page.tsx
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getLatestCompleteRound, getPreviousCompleteRound, getInProgressRound } from '@/lib/db/rounds'
import { getScoresForRound } from '@/lib/db/scores'
import { getManagerScoresForDirectReport } from '@/lib/db/manager-scores'
import { getPlansForUser } from '@/lib/db/development-plans'
import { getScheduledRound } from '@/lib/db/scheduled-rounds'
import {
  PILLARS,
  PILLAR_LABELS,
  getSkillsByPillar,
  LEVEL_VALUES,
  type Pillar,
  type Level,
} from '@/lib/skills'
import { RadarWithToggle } from '@/components/app/RadarWithToggle'
import { PillarAccordion } from '@/components/app/PillarAccordion'
import type { PillarData } from '@/components/app/PillarAccordion'
import { ScheduleWidget } from '@/components/app/ScheduleWidget'
import { GrowthSummaryCard } from '@/components/app/GrowthSummaryCard'

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const round = await getLatestCompleteRound(user.id)

  // ── Empty state ──────────────────────────────────────────────────────────────
  if (!round) {
    return (
      <div className="flex flex-col items-start gap-4 py-16 px-4">
        <h1 className="text-2xl font-bold text-white">Welcome to Brilliant Managers</h1>
        <p className="text-sm text-slate-400">
          Your dashboard will come alive once you&apos;ve completed your first self-assessment.
        </p>
        <Link
          href="/scorecard"
          className="rounded-lg bg-amber-500 px-6 py-3 text-sm font-semibold text-white hover:bg-amber-400"
        >
          Start your scorecard →
        </Link>
      </div>
    )
  }

  // ── Parallel data fetch ───────────────────────────────────────────────────────
  const [scores, managerScores, plans, scheduled, inProgress] = await Promise.all([
    getScoresForRound(round.id),
    getManagerScoresForDirectReport(round.id),
    getPlansForUser(user.id),
    getScheduledRound(user.id),
    getInProgressRound(user.id),
  ])

  const hasManagerScores = managerScores.length > 0

  // ── Overall score + trend ────────────────────────────────────────────────────
  const overallAvg =
    scores.length > 0
      ? scores.reduce((sum, s) => sum + LEVEL_VALUES[s.level as Level], 0) / scores.length
      : 0

  const roundDate = new Date(round.completed_at ?? round.created_at).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  })

  // Trend: fetch previous round's scores if it exists
  const prevRound = round.completed_at
    ? await getPreviousCompleteRound(user.id, round.completed_at)
    : null
  let trend: { delta: number } | null = null
  if (prevRound) {
    const prevScores = await getScoresForRound(prevRound.id)
    if (prevScores.length > 0) {
      const prevAvg =
        prevScores.reduce((sum, s) => sum + LEVEL_VALUES[s.level as Level], 0) / prevScores.length
      trend = { delta: overallAvg - prevAvg }
    }
  }

  // ── Pillar data (radar + accordion) ─────────────────────────────────────────
  const activePlanKeys = new Set(
    plans.filter(p => p.status === 'planned' || p.status === 'in_progress').map(p => p.skill_key)
  )
  const planGoalByKey = Object.fromEntries(
    plans.filter(p => p.status !== 'completed').map(p => [p.skill_key, p.goal])
  )

  const pillarScoresForRadar = PILLARS.map(pillar => {
    const pillarSkills = getSkillsByPillar(pillar as Pillar)
    const pillarSelfScores = scores.filter(s => s.pillar === pillar)
    const selfAvg =
      pillarSelfScores.length > 0
        ? pillarSelfScores.reduce((sum, s) => sum + LEVEL_VALUES[s.level as Level], 0) /
          pillarSelfScores.length
        : 0

    const managerPillarScores = managerScores.filter(ms =>
      pillarSkills.some(s => s.key === ms.skill_key)
    )
    const managerAvg =
      managerPillarScores.length > 0
        ? managerPillarScores.reduce((sum, ms) => sum + LEVEL_VALUES[ms.level as Level], 0) /
          managerPillarScores.length
        : undefined

    return { pillar: pillar as Pillar, selfScore: selfAvg, managerScore: managerAvg }
  })

  const pillarScoreMap = Object.fromEntries(
    pillarScoresForRadar.map(p => [p.pillar, p.selfScore])
  )
  const lowestPillar = PILLARS.reduce((lowest, p) =>
    pillarScoreMap[p] < pillarScoreMap[lowest] ? p : lowest
  )

  const pillarsForAccordion: PillarData[] = PILLARS.map(pillar => {
    const pillarSkills = getSkillsByPillar(pillar as Pillar)
    const pillarSelfScores = scores.filter(s => s.pillar === pillar)
    const selfAvg = pillarScoresForRadar.find(p => p.pillar === pillar)?.selfScore ?? 0

    return {
      pillar,
      label: PILLAR_LABELS[pillar as Pillar],
      score: selfAvg,
      isLowest: pillar === lowestPillar,
      skills: pillarSkills.map(skill => {
        const selfScore = pillarSelfScores.find(s => s.skill_key === skill.key)
        const level = (selfScore?.level ?? 'Basic') as Level
        const score = LEVEL_VALUES[level]
        const hasActiveGoal = activePlanKeys.has(skill.key)
        let chipType: 'opportunity' | 'goal' | null = null
        if (hasActiveGoal) chipType = 'goal'
        else if (score <= 2) chipType = 'opportunity'
        return {
          key: skill.key,
          name: skill.label,
          description: skill.description,
          level,
          score,
          chipType,
          goalText: hasActiveGoal ? planGoalByKey[skill.key] : undefined,
        }
      }),
    }
  })

  const showStartNewRound = !inProgress

  return (
    <div className="p-6">
      {/* Three-column grid, collapses to single column on medium screens */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-[220px_1fr_260px]">

        {/* ── Left: Radar + score ──────────────────────────────────────────── */}
        <aside className="flex flex-col gap-4">
          <RadarWithToggle
            pillarScores={pillarScoresForRadar}
            hasManagerScores={hasManagerScores}
          />

          {/* Overall score chip */}
          <div className="rounded-xl bg-slate-800 px-4 py-3 text-center">
            <p className="text-3xl font-bold text-amber-400">{overallAvg.toFixed(1)}</p>
            <p className="text-xs text-slate-400">Overall score</p>
            <p className="mt-0.5 text-xs text-slate-500">{roundDate}</p>
          </div>

          {/* Trend chip */}
          {trend !== null && (
            <div
              className="rounded-xl px-4 py-2 text-center text-sm font-semibold"
              style={
                trend.delta >= 0
                  ? { background: 'rgba(74,222,128,0.1)', color: '#4ade80' }
                  : { background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }
              }
            >
              {trend.delta >= 0 ? '+' : ''}
              {trend.delta.toFixed(1)} {trend.delta >= 0 ? '↑' : '↓'}
            </div>
          )}
        </aside>

        {/* ── Centre: Pillar accordion ─────────────────────────────────────── */}
        <main className="min-w-0">
          <PillarAccordion pillars={pillarsForAccordion} />
        </main>

        {/* ── Right: Action cards ──────────────────────────────────────────── */}
        <aside className="flex flex-col gap-4">
          <ScheduleWidget scheduled={scheduled} />
          <GrowthSummaryCard plans={plans} />

          {!hasManagerScores && (
            <div
              className="rounded-xl px-5 py-4"
              style={{ background: '#1e3a5f', border: '1px solid rgba(245,158,11,0.2)' }}
            >
              <p className="mb-1 text-sm font-semibold text-white">Invite your manager</p>
              <p className="mb-3 text-xs text-slate-400">
                They score you independently, then you compare.
              </p>
              <Link
                href="/connections"
                className="text-xs font-semibold text-amber-400 hover:text-amber-300"
              >
                Connect →
              </Link>
            </div>
          )}

          {showStartNewRound && (
            <Link
              href="/scorecard"
              className="text-center text-xs text-slate-500 hover:text-slate-300"
            >
              Start new round →
            </Link>
          )}
        </aside>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | grep -v "node_modules" | head -30
```

Expected: no new errors. Fix any that appear before moving on.

- [ ] **Step 3: Run the full test suite**

```bash
npx vitest run
```

Expected: all previously passing tests still pass

- [ ] **Step 4: Commit**

```bash
git add app/\(app\)/dashboard/page.tsx
git commit -m "feat: rewrite dashboard with Mission Control 3-column layout"
```

---

## Task 14: Results Page Retirement + Link Updates

**Files:**
- Modify: `app/(app)/results/page.tsx`
- Modify: `app/(app)/scorecard/page.tsx`

- [ ] **Step 1: Replace results page with redirect**

Replace the entire contents of `app/(app)/results/page.tsx` with:

```typescript
// app/(app)/results/page.tsx
import { redirect } from 'next/navigation'

export default function ResultsPage() {
  redirect('/dashboard')
}
```

- [ ] **Step 2: Update /results link in scorecard page**

In `app/(app)/scorecard/page.tsx`, line 72 currently has:
```tsx
href="/results"
```
Change it to:
```tsx
href="/dashboard"
```

The `View results →` link text can stay or change to `View dashboard →`. Change the text too:
```tsx
View dashboard →
```

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | grep -v "node_modules" | head -20
```

Expected: no new errors

- [ ] **Step 4: Verify no remaining /results links**

```bash
grep -r 'href="/results"' app/ components/ --include="*.tsx" --include="*.ts"
```

Expected: no output (all links updated)

- [ ] **Step 5: Run full test suite**

```bash
npx vitest run
```

Expected: all tests passing

- [ ] **Step 6: Commit**

```bash
git add app/\(app\)/results/page.tsx app/\(app\)/scorecard/page.tsx
git commit -m "feat: retire Results page with redirect to dashboard, update scorecard link"
```

---

## Task 15: Final Verification

**Files:** no changes

- [ ] **Step 1: Run full TypeScript check**

```bash
npx tsc --noEmit 2>&1 | grep -v "node_modules"
```

Expected: no errors (pre-existing TS2582 vitest errors in old test files are pre-existing and acceptable — flag if there are new errors)

- [ ] **Step 2: Run complete test suite**

```bash
npx vitest run
```

Expected: all tests pass. Record the count:
- countdown tests: 7
- ical tests: 7
- SkillChip tests: 4
- PillarAccordion tests: 6
- ScheduleWidget tests: 5
- any pre-existing tests: unchanged

- [ ] **Step 3: Verify no stray /results or max-w-2xl references**

```bash
grep -r 'href="/results"' app/ components/ --include="*.tsx"
grep -r 'max-w-2xl' app/\(app\)/ --include="*.tsx"
```

Expected: no output from either command (dashboard/page.tsx should not have max-w-2xl since it uses the full-width grid)

- [ ] **Step 4: Git status sanity check**

```bash
git status
git diff --stat HEAD~1
```

Review that only intended files are modified. No generated artifacts (`*.tsbuildinfo`, `.next/`) should appear.

- [ ] **Step 5: Final commit (if any loose files)**

```bash
git status
# If clean, nothing to do
```

---

## Spec self-review notes

**Spec coverage check:**
- ✅ `scheduled_rounds` table + RLS — Task 1
- ✅ `lib/db/scheduled-rounds.ts` helpers — Task 3
- ✅ `lib/countdown.ts` + `lib/ical.ts` with tests — Task 2
- ✅ Dashboard server actions — Task 4
- ✅ Sidebar nav (Dashboard/Growth/Connections/Organisation) — Task 5
- ✅ `max-w-5xl` on all non-dashboard pages — Task 6
- ✅ `SkillChip` (opportunity/goal, Lightbulb/Target, correct colours) — Task 7
- ✅ `RadarWithToggle` with Self/Manager toggle — Task 8
- ✅ `PillarAccordion` (always-on chips, accordion expand, Opportunities/Active Goals sections, lowest-pillar highlight, "Make goal →", "In Growth →") — Task 9
- ✅ `ScheduleWidget` (unscheduled form, scheduled countdown, edit/delete, Google Calendar link, .ics download) — Task 10
- ✅ `GrowthSummaryCard` (active count, top 2 skills by pillar order, empty state) — Task 11
- ✅ `/api/export-ical` route — Task 12
- ✅ Dashboard page: empty state, populated 3-col grid, parallel fetch, trend chip, "Start new round →" link — Task 13
- ✅ Results page → redirect('/dashboard'), scorecard /results link updated — Task 14
- ✅ `getPreviousCompleteRound`, `getInProgressRound` added to rounds.ts — Task 3
