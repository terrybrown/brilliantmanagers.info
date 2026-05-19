# Team & Org Consolidation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consolidate `/connections` and `/organisation` into a single `/people` page ("Team & Org"), replace the dashboard manager-invite link with a modal, wire Mailgun emails for manager invites, and enhance the Super Admin organisations table with Last Activity, Org Admins, and Node Count columns.

**Architecture:** The new `/people` page is a Next.js server component that fetches connection, org, and direct-report round data in parallel, passing it to client sub-components. Email is sent via a new `lib/email/mailgun.ts` module called from the updated `inviteConnection` server action, whose signature changes to `(prevState, formData) → InviteState` to support `useActionState` in client modals. Old `/connections` and `/organisation` routes become redirect stubs pointing at `/people`.

**Tech Stack:** Next.js 15 App Router, Supabase (PostgreSQL + RLS), Mailgun HTTP API, Vitest + Testing Library, TypeScript, Tailwind CSS v4

---

## New env vars required

Add to `.env.local` (and Netlify env settings):
```
MAILGUN_DOMAIN=mg.brilliantmanagers.info
MAILGUN_FROM_EMAIL=noreply@brilliantmanagers.info
```

---

## File Map

### New files
| File | Purpose |
|---|---|
| `lib/email/mailgun.ts` | Mailgun HTTP client — `sendEmail()` |
| `lib/email/templates/manager-invite.ts` | HTML template for manager invite email |
| `lib/db/direct-reports.ts` | `getDirectReportRoundSummaries()` per-user batch |
| `components/people/InviteManagerModal.tsx` | Modal: email + personal message, calls `inviteConnection` |
| `components/people/AddConnectionForm.tsx` | Inline form: email + role, calls `inviteConnection` |
| `components/org/OrgHierarchy.tsx` | Org tree: headcount for all, expand + admin controls for admins |
| `app/(app)/people/page.tsx` | New `/people` server component |
| `app/(app)/people/YourConnections.tsx` | Client: pending / you-report-to / direct-reports |
| `app/(app)/people/OrgSection.tsx` | Client: no-org CTA or OrgHierarchy wrapper |
| `__tests__/lib/email/mailgun.test.ts` | Unit tests for `sendEmail` |
| `__tests__/lib/db/direct-reports.test.ts` | Unit tests for `getDirectReportRoundSummaries` |
| `__tests__/app/people/YourConnections.test.tsx` | Component tests for `YourConnections` |

### Modified files
| File | Change |
|---|---|
| `app/(app)/connections/actions.ts` | New signature, error surfacing, email send, message field |
| `app/(app)/connections/page.tsx` | Replace with `redirect('/people')` |
| `app/(app)/organisation/page.tsx` | Replace with `redirect('/people')` |
| `app/(app)/organisation/actions.ts` | `requireOrgAdmin` redirect `/organisation` → `/people` |
| `components/dashboard/DashboardResults.tsx` | Replace `<Link href="/connections">` with `<InviteManagerModal>` |
| `app/(app)/admin/organisations/page.tsx` | Add Last Activity, Org Admins (display_name), Node Count columns |
| `components/app/Sidebar.tsx` | Replace Connections + Organisation items with Team & Org → `/people` |
| `components/app/Topbar.tsx` | Add `/people` → `'Team & Org'` label, remove `/connections` |
| `components/layout/nav.tsx` | Add `/people`, remove `/connections` |
| `middleware.ts` | Replace `/connections` + `/organisation` in `APP_ROUTES` with `/people` |

---

## Task 1: Mailgun email service

**Files:**
- Create: `lib/email/mailgun.ts`
- Create: `__tests__/lib/email/mailgun.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// __tests__/lib/email/mailgun.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('sendEmail', () => {
  beforeEach(() => {
    vi.stubEnv('MAILGUN_DOMAIN', 'mg.example.com')
    vi.stubEnv('MAILGUN_BASE_URL', 'https://api.eu.mailgun.net')
    vi.stubEnv('MAILGUN_SENDING_KEY', 'test-sending-key')
    vi.stubEnv('MAILGUN_FROM_EMAIL', 'noreply@example.com')
    mockFetch.mockResolvedValue({ ok: true, text: async () => '' })
  })
  afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks() })

  it('POSTs to the correct Mailgun endpoint', async () => {
    const { sendEmail } = await import('@/lib/email/mailgun')
    await sendEmail({ to: 'boss@example.com', subject: 'Hello', html: '<p>Hi</p>' })
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.eu.mailgun.net/v3/mg.example.com/messages',
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('sets Basic auth header using MAILGUN_SENDING_KEY', async () => {
    const { sendEmail } = await import('@/lib/email/mailgun')
    await sendEmail({ to: 'x@y.com', subject: 'S', html: '<p></p>' })
    const [, init] = mockFetch.mock.calls[0]
    const expected = `Basic ${Buffer.from('api:test-sending-key').toString('base64')}`
    expect(init.headers['Authorization']).toBe(expected)
  })

  it('throws on non-OK response', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 401, text: async () => 'Unauthorized' })
    const { sendEmail } = await import('@/lib/email/mailgun')
    await expect(sendEmail({ to: 'x@y.com', subject: 'S', html: '<p></p>' })).rejects.toThrow(
      'Mailgun error 401'
    )
  })

  it('throws when required env vars are missing', async () => {
    vi.unstubAllEnvs()
    const { sendEmail } = await import('@/lib/email/mailgun')
    await expect(sendEmail({ to: 'x@y.com', subject: 'S', html: '<p></p>' })).rejects.toThrow(
      'Mailgun configuration missing'
    )
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test -- mailgun
```
Expected: 4 failures (module not found or function not defined)

- [ ] **Step 3: Implement `lib/email/mailgun.ts`**

```typescript
interface SendEmailParams {
  to: string
  subject: string
  html: string
}

export async function sendEmail({ to, subject, html }: SendEmailParams): Promise<void> {
  const domain = process.env.MAILGUN_DOMAIN
  const baseUrl = process.env.MAILGUN_BASE_URL
  const sendingKey = process.env.MAILGUN_SENDING_KEY
  const from = process.env.MAILGUN_FROM_EMAIL ?? `noreply@${domain}`

  if (!domain || !baseUrl || !sendingKey) {
    throw new Error('Mailgun configuration missing')
  }

  const body = new URLSearchParams({ from, to, subject, html })

  const response = await fetch(`${baseUrl}/v3/${domain}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`api:${sendingKey}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Mailgun error ${response.status}: ${text}`)
  }
}
```

- [ ] **Step 4: Run tests to confirm all pass**

```bash
npm test -- mailgun
```
Expected: 4 passing

- [ ] **Step 5: Commit**

```bash
git checkout -b feat/team-and-org-consolidation
git add lib/email/mailgun.ts __tests__/lib/email/mailgun.test.ts
git commit -m "feat: add Mailgun email service"
```

---

## Task 2: Manager invite email template

**Files:**
- Create: `lib/email/templates/manager-invite.ts`

- [ ] **Step 1: Write failing test**

```typescript
// Add to __tests__/lib/email/mailgun.test.ts (or new file __tests__/lib/email/manager-invite.test.ts)
import { describe, it, expect } from 'vitest'
import { buildManagerInviteEmail } from '@/lib/email/templates/manager-invite'

describe('buildManagerInviteEmail', () => {
  it('includes sender name in subject', () => {
    const { subject } = buildManagerInviteEmail({ fromName: 'Alice', toEmail: 'bob@example.com' })
    expect(subject).toContain('Alice')
  })

  it('includes a link to /people in the html body', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://app.example.com')
    const { html } = buildManagerInviteEmail({ fromName: 'Alice', toEmail: 'bob@example.com' })
    expect(html).toContain('https://app.example.com/people')
    vi.unstubAllEnvs()
  })

  it('includes the personal message when provided', () => {
    const { html } = buildManagerInviteEmail({
      fromName: 'Alice',
      toEmail: 'bob@example.com',
      personalMessage: 'Hi Bob, join me!',
    })
    expect(html).toContain('Hi Bob, join me!')
  })

  it('omits the personal message block when not provided', () => {
    const { html } = buildManagerInviteEmail({ fromName: 'Alice', toEmail: 'bob@example.com' })
    expect(html).not.toContain('personal-message')
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test -- manager-invite
```

- [ ] **Step 3: Implement `lib/email/templates/manager-invite.ts`**

```typescript
interface ManagerInviteEmailParams {
  fromName: string
  toEmail: string
  personalMessage?: string
}

interface EmailContent {
  subject: string
  html: string
}

export function buildManagerInviteEmail({
  fromName,
  personalMessage,
}: ManagerInviteEmailParams): EmailContent {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://brilliantmanagers.info'
  const acceptUrl = `${appUrl}/people`

  const messageBlock = personalMessage
    ? `<div class="personal-message"
           style="margin:20px 0;padding:12px 16px;background:#1e2d3d;border-left:3px solid #f59e0b;
                  border-radius:4px;font-style:italic;color:#94a3b8;">
         "${personalMessage}"
       </div>`
    : ''

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0d1117;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:40px auto;padding:0 16px;">
    <div style="background:#111827;border:1px solid #1f2937;border-radius:12px;overflow:hidden;">
      <div style="padding:24px 32px;border-bottom:1px solid #1f2937;">
        <p style="margin:0;font-size:22px;font-weight:700;color:#f1f5f9;">Brilliant Managers</p>
      </div>
      <div style="padding:32px;">
        <p style="margin:0 0 16px;color:#e2e8f0;font-size:16px;">Hi there,</p>
        <p style="margin:0 0 16px;color:#cbd5e1;font-size:15px;line-height:1.6;">
          <strong style="color:#f1f5f9;">${fromName}</strong> is using Brilliant Managers to track their
          management effectiveness and has invited you to be their manager so you can score their
          reflections and help them grow.
        </p>
        ${messageBlock}
        <div style="margin:28px 0;">
          <a href="${acceptUrl}"
             style="display:inline-block;padding:12px 24px;background:#4f46e5;color:#fff;
                    font-weight:600;font-size:15px;text-decoration:none;border-radius:8px;">
            Accept invitation →
          </a>
        </div>
        <p style="margin:0;color:#4b5563;font-size:13px;line-height:1.5;">
          If you weren't expecting this, you can safely ignore it. You'll need to sign in to
          Brilliant Managers to accept the invitation.
        </p>
      </div>
    </div>
  </div>
</body>
</html>`

  return {
    subject: `${fromName} has invited you to support their development`,
    html,
  }
}
```

- [ ] **Step 4: Run tests to confirm all pass**

```bash
npm test -- manager-invite
```

- [ ] **Step 5: Commit**

```bash
git add lib/email/templates/manager-invite.ts __tests__/lib/email/manager-invite.test.ts
git commit -m "feat: add manager invite email template"
```

---

## Task 3: Update `inviteConnection` action

**Files:**
- Modify: `app/(app)/connections/actions.ts`

The action's return type changes from `void` to `InviteState` and its signature gains a `prevState` parameter to support `useActionState`. It now sends an email when the initiator is inviting their manager (`role === 'direct_report'`).

- [ ] **Step 1: Write failing tests**

```typescript
// __tests__/app/connections/actions.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1', email: 'me@example.com' } } }),
    },
    from: vi.fn((table: string) => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: table === 'profiles' ? { display_name: 'Alice' } : null,
      }),
    })),
  }),
}))

vi.mock('@/lib/db/connections', () => ({
  createConnection: vi.fn().mockResolvedValue({}),
}))

vi.mock('@/lib/audit', () => ({
  logAudit: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/email/mailgun', () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/email/templates/manager-invite', () => ({
  buildManagerInviteEmail: vi.fn().mockReturnValue({ subject: 'S', html: '<p></p>' }),
}))

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

describe('inviteConnection', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns { success: true } on happy path', async () => {
    const { inviteConnection } = await import('@/app/(app)/connections/actions')
    const fd = new FormData()
    fd.set('email', 'boss@example.com')
    fd.set('role', 'direct_report')
    const result = await inviteConnection({ success: false }, fd)
    expect(result).toEqual({ success: true })
  })

  it('calls sendEmail when role is direct_report', async () => {
    const { sendEmail } = await import('@/lib/email/mailgun')
    const { inviteConnection } = await import('@/app/(app)/connections/actions')
    const fd = new FormData()
    fd.set('email', 'boss@example.com')
    fd.set('role', 'direct_report')
    await inviteConnection({ success: false }, fd)
    expect(sendEmail).toHaveBeenCalledOnce()
  })

  it('does NOT call sendEmail when role is manager', async () => {
    const { sendEmail } = await import('@/lib/email/mailgun')
    const { inviteConnection } = await import('@/app/(app)/connections/actions')
    const fd = new FormData()
    fd.set('email', 'report@example.com')
    fd.set('role', 'manager')
    await inviteConnection({ success: false }, fd)
    expect(sendEmail).not.toHaveBeenCalled()
  })

  it('returns { success: false, error } when createConnection fails', async () => {
    const { createConnection } = await import('@/lib/db/connections')
    vi.mocked(createConnection).mockResolvedValueOnce({ error: 'No account found for that email. Ask them to sign up first.' })
    const { inviteConnection } = await import('@/app/(app)/connections/actions')
    const fd = new FormData()
    fd.set('email', 'nobody@example.com')
    fd.set('role', 'direct_report')
    const result = await inviteConnection({ success: false }, fd)
    expect(result.success).toBe(false)
    expect(result.error).toContain('No account')
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test -- connections/actions
```

- [ ] **Step 3: Update `app/(app)/connections/actions.ts`**

Replace the file content entirely:

```typescript
'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createConnection, acceptConnection } from '@/lib/db/connections'
import { logAudit } from '@/lib/audit'
import { sendEmail } from '@/lib/email/mailgun'
import { buildManagerInviteEmail } from '@/lib/email/templates/manager-invite'

export type InviteState = { success: boolean; error?: string }

export async function inviteConnection(
  _prevState: InviteState,
  formData: FormData
): Promise<InviteState> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const email = formData.get('email') as string
  const role = formData.get('role') as 'manager' | 'direct_report'
  const message = (formData.get('message') as string | null) ?? ''

  const { error } = await createConnection({
    initiatorId: user.id,
    otherEmail: email,
    initiatorRole: role,
  })
  if (error) return { success: false, error }

  await logAudit({
    actorId: user.id,
    action: 'connection.create',
    entityType: 'connection',
    metadata: { otherEmail: email, initiatorRole: role },
  })

  if (role === 'direct_report') {
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', user.id)
      .single()
    const fromName = profile?.display_name ?? user.email ?? 'A colleague'
    const { subject, html } = buildManagerInviteEmail({
      fromName,
      toEmail: email,
      personalMessage: message || undefined,
    })
    try {
      await sendEmail({ to: email, subject, html })
    } catch (e) {
      console.error('Manager invite email failed:', e)
    }
  }

  revalidatePath('/people')
  return { success: true }
}

export async function acceptConnectionAction(connectionId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  await acceptConnection(connectionId)

  await logAudit({
    actorId: user.id,
    action: 'connection.accept',
    entityType: 'connection',
    entityId: connectionId,
  })

  revalidatePath('/people')
}
```

- [ ] **Step 4: Run tests to confirm all pass**

```bash
npm test -- connections/actions
```

- [ ] **Step 5: Run full test suite to check for regressions**

```bash
npm test
```

- [ ] **Step 6: Commit**

```bash
git add app/\(app\)/connections/actions.ts __tests__/app/connections/actions.test.ts
git commit -m "feat: update inviteConnection to return state and send manager invite email"
```

---

## Task 4: Direct report round summaries batch query

**Files:**
- Create: `lib/db/direct-reports.ts`
- Create: `__tests__/lib/db/direct-reports.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// __tests__/lib/db/direct-reports.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Round } from '@/lib/db/rounds'
import type { ScheduledRound } from '@/lib/db/scheduled-rounds'

let mockInProgress: Round | null = null
let mockScheduled: ScheduledRound | null = null
let mockLastRound: { id: string } | null = null
let mockScoreRows: { level: string }[] = []
let mockManagerCount = 0

vi.mock('@/lib/db/rounds', () => ({
  getInProgressRound: vi.fn(() => Promise.resolve(mockInProgress)),
}))

vi.mock('@/lib/db/scheduled-rounds', () => ({
  getScheduledRound: vi.fn(() => Promise.resolve(mockScheduled)),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      from: (table: string) => {
        if (table === 'assessment_rounds') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            not: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn(() => Promise.resolve({ data: mockLastRound })),
          }
        }
        if (table === 'scores') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn(() => Promise.resolve({ data: mockScoreRows })),
          }
        }
        // manager_scores
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn(() => Promise.resolve({ count: mockManagerCount })),
        }
      },
    })
  ),
}))

describe('getDirectReportRoundSummaries', () => {
  beforeEach(() => {
    mockInProgress = null
    mockScheduled = null
    mockLastRound = null
    mockScoreRows = []
    mockManagerCount = 0
    vi.clearAllMocks()
  })

  it('returns empty object for empty input', async () => {
    const { getDirectReportRoundSummaries } = await import('@/lib/db/direct-reports')
    expect(await getDirectReportRoundSummaries([])).toEqual({})
  })

  it('returns in_progress status when round is in progress', async () => {
    mockInProgress = { id: 'r1', user_id: 'u1', status: 'in_progress', created_at: '', completed_at: null }
    const { getDirectReportRoundSummaries } = await import('@/lib/db/direct-reports')
    const result = await getDirectReportRoundSummaries(['u1'])
    expect(result['u1'].roundStatus).toBe('in_progress')
  })

  it('returns scheduled status when no in-progress but scheduled exists', async () => {
    mockScheduled = { id: 's1', user_id: 'u1', scheduled_date: '2026-07-01', created_at: '', updated_at: '' }
    const { getDirectReportRoundSummaries } = await import('@/lib/db/direct-reports')
    const result = await getDirectReportRoundSummaries(['u1'])
    expect(result['u1'].roundStatus).toBe('scheduled')
    expect(result['u1'].nextScheduledDate).toBe('2026-07-01')
  })

  it('returns null lastScore when no complete rounds', async () => {
    const { getDirectReportRoundSummaries } = await import('@/lib/db/direct-reports')
    const result = await getDirectReportRoundSummaries(['u1'])
    expect(result['u1'].lastScore).toBeNull()
  })

  it('computes lastScore as average of LEVEL_VALUES', async () => {
    mockLastRound = { id: 'r1' }
    mockScoreRows = [{ level: 'Proficient' }, { level: 'Advanced' }] // 3 + 4 → avg 3.5
    const { getDirectReportRoundSummaries } = await import('@/lib/db/direct-reports')
    const result = await getDirectReportRoundSummaries(['u1'])
    expect(result['u1'].lastScore).toBe(3.5)
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test -- direct-reports
```

- [ ] **Step 3: Implement `lib/db/direct-reports.ts`**

```typescript
import { createClient } from '@/lib/supabase/server'
import { getInProgressRound } from '@/lib/db/rounds'
import { getScheduledRound } from '@/lib/db/scheduled-rounds'
import { LEVEL_VALUES } from '@/lib/skills'
import type { Level } from '@/lib/skills'

export interface DirectReportRoundSummary {
  roundStatus: 'in_progress' | 'scheduled' | 'none'
  lastScore: number | null
  nextScheduledDate: string | null
  managerHasScored: boolean
}

export async function getDirectReportRoundSummaries(
  directReportIds: string[]
): Promise<Record<string, DirectReportRoundSummary>> {
  if (directReportIds.length === 0) return {}

  const entries = await Promise.all(
    directReportIds.map(async (userId) => {
      const supabase = await createClient()
      const [inProgress, scheduled] = await Promise.all([
        getInProgressRound(userId),
        getScheduledRound(userId),
      ])

      const roundStatus = inProgress ? 'in_progress' : scheduled ? 'scheduled' : 'none'

      // Most recent complete round
      const { data: lastRound } = await supabase
        .from('assessment_rounds')
        .select('id')
        .eq('user_id', userId)
        .eq('status', 'complete')
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      let lastScore: number | null = null
      if (lastRound) {
        const { data: scoreRows } = await supabase
          .from('scores')
          .select('level')
          .eq('round_id', lastRound.id)
        const levels = (scoreRows ?? []) as { level: Level }[]
        if (levels.length > 0) {
          const avg = levels.reduce((sum, s) => sum + LEVEL_VALUES[s.level], 0) / levels.length
          lastScore = Number(avg.toFixed(1))
        }
      }

      // Manager has scored the in-progress round
      let managerHasScored = false
      if (inProgress) {
        const { count } = await supabase
          .from('manager_scores')
          .select('*', { count: 'exact', head: true })
          .eq('round_id', inProgress.id)
        managerHasScored = (count ?? 0) > 0
      }

      return [userId, {
        roundStatus: roundStatus as DirectReportRoundSummary['roundStatus'],
        lastScore,
        nextScheduledDate: scheduled?.scheduled_date ?? null,
        managerHasScored,
      }] as [string, DirectReportRoundSummary]
    })
  )

  return Object.fromEntries(entries)
}
```

- [ ] **Step 4: Run tests to confirm all pass**

```bash
npm test -- direct-reports
```

- [ ] **Step 5: Commit**

```bash
git add lib/db/direct-reports.ts __tests__/lib/db/direct-reports.test.ts
git commit -m "feat: add getDirectReportRoundSummaries batch query"
```

---

## Task 5: `InviteManagerModal` and `AddConnectionForm` components

**Files:**
- Create: `components/people/InviteManagerModal.tsx`
- Create: `components/people/AddConnectionForm.tsx`

- [ ] **Step 1: Create `components/people/InviteManagerModal.tsx`**

```typescript
'use client'
import { useActionState, useState } from 'react'
import { inviteConnection } from '@/app/(app)/connections/actions'
import type { InviteState } from '@/app/(app)/connections/actions'

const initial: InviteState = { success: false }

interface Props {
  trigger?: React.ReactNode
}

export function InviteManagerModal({ trigger }: Props) {
  const [open, setOpen] = useState(false)
  const [state, formAction, pending] = useActionState(inviteConnection, initial)

  if (state.success) {
    return (
      <div
        className="rounded-xl px-5 py-4"
        style={{ background: '#1e3a5f', border: '1px solid rgba(34,197,94,0.3)' }}
      >
        <p className="text-sm font-semibold text-green-400">Invite sent!</p>
        <p className="mt-1 text-xs text-slate-400">
          We've emailed your manager — they'll see a pending invite when they sign in.
        </p>
      </div>
    )
  }

  return (
    <>
      <div onClick={() => setOpen(true)}>
        {trigger ?? (
          <button
            type="button"
            className="text-xs font-semibold text-amber-400 hover:text-amber-300"
          >
            Connect →
          </button>
        )}
      </div>

      {open && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 50,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 16,
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false) }}
        >
          <div
            style={{
              background: '#111827', border: '1px solid #1f2937',
              borderRadius: 12, padding: 28, width: '100%', maxWidth: 460,
            }}
          >
            <h2 className="mb-1 text-lg font-bold text-white">Invite your manager</h2>
            <p className="mb-5 text-sm text-slate-400">
              We'll send them an email so they can connect and score your reflections.
            </p>
            <form action={formAction} className="flex flex-col gap-4">
              <input type="hidden" name="role" value="direct_report" />
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400">
                  Their email address
                </label>
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="manager@company.com"
                  className="mock-input w-full"
                  style={{ background: '#0d1117', border: '1px solid #1f2937', borderRadius: 6,
                           padding: '8px 12px', color: '#f1f5f9', fontSize: 14, width: '100%' }}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400">
                  Personal message <span className="text-slate-600">(optional)</span>
                </label>
                <textarea
                  name="message"
                  rows={3}
                  placeholder="Hi — I've been using Brilliant Managers to track my development. I'd love your perspective on my reflections."
                  style={{ background: '#0d1117', border: '1px solid #1f2937', borderRadius: 6,
                           padding: '8px 12px', color: '#f1f5f9', fontSize: 14, width: '100%',
                           resize: 'vertical' }}
                />
              </div>
              {state.error && (
                <p className="text-sm text-red-400">{state.error}</p>
              )}
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={pending}
                  style={{
                    flex: 1, padding: '9px 0', background: '#4f46e5',
                    color: '#fff', fontWeight: 600, fontSize: 14,
                    border: 'none', borderRadius: 8, cursor: pending ? 'not-allowed' : 'pointer',
                    opacity: pending ? 0.6 : 1,
                  }}
                >
                  {pending ? 'Sending…' : 'Send invite'}
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  style={{
                    padding: '9px 18px', background: 'transparent',
                    color: '#6b7280', fontWeight: 500, fontSize: 14,
                    border: '1px solid #1f2937', borderRadius: 8, cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
```

- [ ] **Step 2: Create `components/people/AddConnectionForm.tsx`**

```typescript
'use client'
import { useActionState } from 'react'
import { useState } from 'react'
import { inviteConnection } from '@/app/(app)/connections/actions'
import type { InviteState } from '@/app/(app)/connections/actions'

const initial: InviteState = { success: false }

export function AddConnectionForm() {
  const [open, setOpen] = useState(false)
  const [state, formAction, pending] = useActionState(inviteConnection, initial)

  if (state.success) {
    return (
      <p className="text-sm text-green-400">Invite sent successfully.</p>
    )
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          padding: '7px 16px', background: 'rgba(99,102,241,0.12)',
          color: '#a78bfa', fontWeight: 600, fontSize: 13,
          border: '1px solid rgba(99,102,241,0.3)', borderRadius: 8, cursor: 'pointer',
        }}
      >
        + Add connection
      </button>
    )
  }

  return (
    <form
      action={formAction}
      style={{
        background: '#111827', border: '1px solid #1f2937',
        borderRadius: 10, padding: 20,
      }}
    >
      <p className="mb-3 text-sm font-semibold text-white">Add a connection</p>
      <div className="flex flex-col gap-3">
        <input
          name="email"
          type="email"
          required
          placeholder="colleague@company.com"
          style={{ background: '#0d1117', border: '1px solid #1f2937', borderRadius: 6,
                   padding: '8px 12px', color: '#f1f5f9', fontSize: 14 }}
        />
        <div className="flex gap-4">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
            <input type="radio" name="role" value="direct_report" defaultChecked />
            They are my manager
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
            <input type="radio" name="role" value="manager" />
            They report to me
          </label>
        </div>
        {state.error && <p className="text-sm text-red-400">{state.error}</p>}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={pending}
            style={{
              padding: '7px 18px', background: '#4f46e5', color: '#fff',
              fontWeight: 600, fontSize: 13, border: 'none', borderRadius: 6,
              cursor: pending ? 'not-allowed' : 'pointer', opacity: pending ? 0.6 : 1,
            }}
          >
            {pending ? 'Sending…' : 'Send invite'}
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            style={{
              padding: '7px 14px', background: 'transparent', color: '#6b7280',
              fontSize: 13, border: '1px solid #1f2937', borderRadius: 6, cursor: 'pointer',
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </form>
  )
}
```

- [ ] **Step 3: Run full test suite to confirm no regressions**

```bash
npm test
```

- [ ] **Step 4: Commit**

```bash
git add components/people/
git commit -m "feat: add InviteManagerModal and AddConnectionForm components"
```

---

## Task 6: `YourConnections` component

**Files:**
- Create: `app/(app)/people/YourConnections.tsx`
- Create: `__tests__/app/people/YourConnections.test.tsx`

A client component that renders pending invites, "You report to", and "Your direct reports" sections.

Define the enriched connection type here for use across /people components:

```typescript
// Put this in app/(app)/people/types.ts (new file)
import type { Connection } from '@/lib/db/connections'
export type EnrichedConnection = Connection & {
  manager: { id: string; email: string; display_name: string }
  direct_report: { id: string; email: string; display_name: string }
}
```

- [ ] **Step 1: Create `app/(app)/people/types.ts`**

```typescript
import type { Connection } from '@/lib/db/connections'
import type { DirectReportRoundSummary } from '@/lib/db/direct-reports'

export type EnrichedConnection = Connection & {
  manager: { id: string; email: string; display_name: string }
  direct_report: { id: string; email: string; display_name: string }
}

export type { DirectReportRoundSummary }
```

- [ ] **Step 2: Write failing tests**

```typescript
// __tests__/app/people/YourConnections.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { YourConnections } from '@/app/(app)/people/YourConnections'
import type { EnrichedConnection } from '@/app/(app)/people/types'
import type { DirectReportRoundSummary } from '@/lib/db/direct-reports'

vi.mock('@/app/(app)/connections/actions', () => ({
  inviteConnection: vi.fn(),
  acceptConnectionAction: vi.fn(),
}))

vi.mock('@/components/people/InviteManagerModal', () => ({
  InviteManagerModal: () => <button>Invite your manager</button>,
}))

const emptyConns = { asManager: [], asDirectReport: [] }

function makeConn(overrides: Partial<EnrichedConnection>): EnrichedConnection {
  return {
    id: 'c1', manager_id: 'm1', direct_report_id: 'dr1',
    status: 'active', initiated_by: 'm1', created_at: '',
    manager: { id: 'm1', email: 'mgr@x.com', display_name: 'The Manager' },
    direct_report: { id: 'dr1', email: 'dr@x.com', display_name: 'The Report' },
    ...overrides,
  }
}

describe('YourConnections', () => {
  it('shows Invite your manager when no manager connected', () => {
    render(<YourConnections connections={emptyConns} roundSummaries={{}} userId="u1" />)
    expect(screen.getByText('Invite your manager')).toBeInTheDocument()
  })

  it('shows manager name when active manager connection exists', () => {
    const conn = makeConn({ manager_id: 'mgr-1', direct_report_id: 'u1', status: 'active' })
    render(
      <YourConnections
        connections={{ asManager: [], asDirectReport: [conn] }}
        roundSummaries={{}} userId="u1"
      />
    )
    expect(screen.getByText('The Manager')).toBeInTheDocument()
  })

  it('shows pending badge for outbound manager invite', () => {
    const conn = makeConn({
      manager_id: 'mgr-1', direct_report_id: 'u1',
      status: 'pending', initiated_by: 'u1',
    })
    render(
      <YourConnections
        connections={{ asManager: [], asDirectReport: [conn] }}
        roundSummaries={{}} userId="u1"
      />
    )
    expect(screen.getByText(/pending/i)).toBeInTheDocument()
  })

  it('shows direct report name', () => {
    const conn = makeConn({ manager_id: 'u1', status: 'active' })
    const summary: DirectReportRoundSummary = {
      roundStatus: 'in_progress', lastScore: 3.8,
      nextScheduledDate: '2026-06-15', managerHasScored: false,
    }
    render(
      <YourConnections
        connections={{ asManager: [conn], asDirectReport: [] }}
        roundSummaries={{ dr1: summary }} userId="u1"
      />
    )
    expect(screen.getByText('The Report')).toBeInTheDocument()
    expect(screen.getByText('3.8')).toBeInTheDocument()
  })

  it('shows Accept/Decline for incoming pending invites', () => {
    const conn = makeConn({ manager_id: 'u1', status: 'pending', initiated_by: 'dr1' })
    render(
      <YourConnections
        connections={{ asManager: [conn], asDirectReport: [] }}
        roundSummaries={{}} userId="u1"
      />
    )
    expect(screen.getByRole('button', { name: /accept/i })).toBeInTheDocument()
  })
})
```

- [ ] **Step 3: Run tests to confirm they fail**

```bash
npm test -- YourConnections
```

- [ ] **Step 4: Create `app/(app)/people/YourConnections.tsx`**

```typescript
'use client'
import { InviteManagerModal } from '@/components/people/InviteManagerModal'
import { AddConnectionForm } from '@/components/people/AddConnectionForm'
import { acceptConnectionAction } from '@/app/(app)/connections/actions'
import type { EnrichedConnection, DirectReportRoundSummary } from './types'

interface Props {
  connections: { asManager: EnrichedConnection[]; asDirectReport: EnrichedConnection[] }
  roundSummaries: Record<string, DirectReportRoundSummary>
  userId: string
}

function initials(name: string) {
  return name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()
}

export function YourConnections({ connections, roundSummaries, userId }: Props) {
  const pendingIncoming = [
    ...connections.asManager.filter(c => c.status === 'pending' && c.initiated_by !== userId),
    ...connections.asDirectReport.filter(c => c.status === 'pending' && c.initiated_by !== userId),
  ]

  const activeManager = connections.asDirectReport.find(c => c.status === 'active')
  const pendingOutboundManager = connections.asDirectReport.find(
    c => c.status === 'pending' && c.initiated_by === userId
  )

  const activeDirectReports = connections.asManager.filter(c => c.status === 'active')

  return (
    <section>
      <div
        className="mb-4 flex items-center justify-between"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 12 }}
      >
        <h2
          style={{
            fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em',
            fontWeight: 600, color: '#a78bfa',
          }}
        >
          Your Connections
        </h2>
        <AddConnectionForm />
      </div>

      {/* Pending incoming */}
      {pendingIncoming.length > 0 && (
        <div className="mb-6">
          <p
            style={{
              fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em',
              fontWeight: 600, color: '#f59e0b', marginBottom: 8,
            }}
          >
            ▾ Pending ({pendingIncoming.length})
          </p>
          <div className="flex flex-col gap-3">
            {pendingIncoming.map(c => {
              const isAsManager = c.manager_id === userId
              const other = isAsManager ? c.direct_report : c.manager
              const rel = isAsManager ? 'wants to connect as your direct report' : 'wants to connect as your manager'
              return (
                <div
                  key={c.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    background: 'rgba(245,158,11,0.06)',
                    border: '1px dashed rgba(245,158,11,0.35)', borderRadius: 8, padding: '10px 14px',
                  }}
                >
                  <Avatar name={other.display_name || other.email} />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 600, fontSize: 13, color: '#f1f5f9', margin: 0 }}>
                      {other.display_name || other.email}
                    </p>
                    <p style={{ fontSize: 11, color: '#9ca3af', margin: '2px 0 0' }}>
                      {other.email} · {rel}
                    </p>
                  </div>
                  <form action={acceptConnectionAction.bind(null, c.id)}>
                    <button
                      type="submit"
                      style={{
                        padding: '5px 12px', background: 'rgba(34,197,94,0.15)',
                        color: '#4ade80', border: '1px solid rgba(34,197,94,0.3)',
                        borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      }}
                    >
                      Accept
                    </button>
                  </form>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* You report to */}
      <div className="mb-6">
        <p
          style={{
            fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em',
            color: '#6b7280', fontWeight: 500, marginBottom: 6,
          }}
        >
          You report to
        </p>
        {activeManager ? (
          <div
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.3)',
              borderRadius: 8, padding: '12px 14px',
            }}
          >
            <Avatar name={activeManager.manager.display_name || activeManager.manager.email} color="#4f46e5" />
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 600, fontSize: 13, color: '#f1f5f9', margin: 0 }}>
                {activeManager.manager.display_name || activeManager.manager.email}
              </p>
              <p style={{ fontSize: 11, color: '#9ca3af', margin: '2px 0 0' }}>
                {activeManager.manager.email}
              </p>
            </div>
            <span
              style={{
                fontSize: 11, background: 'rgba(34,197,94,0.15)',
                color: '#4ade80', padding: '3px 8px', borderRadius: 5,
              }}
            >
              Connected
            </span>
          </div>
        ) : pendingOutboundManager ? (
          <div
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.2)',
              borderRadius: 8, padding: '12px 14px',
            }}
          >
            <Avatar name={pendingOutboundManager.manager.email} color="#4f46e5" />
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 600, fontSize: 13, color: '#f1f5f9', margin: 0 }}>
                {pendingOutboundManager.manager.email}
              </p>
              <p style={{ fontSize: 11, color: '#9ca3af', margin: '2px 0 0' }}>
                Invite sent — waiting for them to accept
              </p>
            </div>
            <span
              style={{
                fontSize: 11, background: 'rgba(245,158,11,0.12)',
                color: '#f59e0b', padding: '3px 8px', borderRadius: 5,
              }}
            >
              Pending
            </span>
          </div>
        ) : (
          <div
            style={{
              background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.15)',
              borderRadius: 8, padding: '12px 14px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}
          >
            <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>No manager connected yet</p>
            <InviteManagerModal
              trigger={
                <button
                  type="button"
                  style={{
                    padding: '5px 14px', background: 'rgba(99,102,241,0.15)',
                    color: '#a78bfa', border: '1px solid rgba(99,102,241,0.3)',
                    borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  Invite your manager
                </button>
              }
            />
          </div>
        )}
      </div>

      {/* Direct reports */}
      <div>
        <p
          style={{
            fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em',
            color: '#6b7280', fontWeight: 500, marginBottom: 6,
          }}
        >
          Your direct reports ({activeDirectReports.length})
        </p>
        {activeDirectReports.length === 0 ? (
          <p style={{ fontSize: 13, color: '#4b5563' }}>No direct reports yet.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {activeDirectReports.map(c => {
              const summary = roundSummaries[c.direct_report_id]
              return <DirectReportCard key={c.id} connection={c} summary={summary} />
            })}
          </div>
        )}
      </div>
    </section>
  )
}

function Avatar({ name, color = '#0891b2' }: { name: string; color?: string }) {
  const letters = name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div
      style={{
        width: 36, height: 36, borderRadius: '50%', background: color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 13, color: '#fff', fontWeight: 600, flexShrink: 0,
      }}
    >
      {letters || '?'}
    </div>
  )
}

function DirectReportCard({
  connection,
  summary,
}: {
  connection: EnrichedConnection
  summary?: DirectReportRoundSummary
}) {
  const dr = connection.direct_report
  const statusLabel = !summary
    ? null
    : summary.roundStatus === 'in_progress'
    ? <span style={{ color: '#4ade80' }}>In progress</span>
    : summary.roundStatus === 'scheduled'
    ? <span style={{ color: '#60a5fa' }}>Scheduled</span>
    : <span style={{ color: '#6b7280' }}>None scheduled</span>

  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 8, padding: '12px 14px',
      }}
    >
      <Avatar name={dr.display_name || dr.email} />
      <div style={{ flex: 1 }}>
        <p style={{ fontWeight: 600, fontSize: 13, color: '#f1f5f9', margin: 0 }}>
          {dr.display_name || dr.email}
        </p>
        <div style={{ display: 'flex', gap: 12, marginTop: 3, fontSize: 11, color: '#9ca3af', flexWrap: 'wrap' }}>
          {summary && (
            <>
              <span>Round: {statusLabel}</span>
              <span>Last score: <strong style={{ color: '#e2e8f0' }}>{summary.lastScore ?? '—'}</strong></span>
              <span>Next: <strong style={{ color: '#e2e8f0' }}>{summary.nextScheduledDate ?? '—'}</strong></span>
            </>
          )}
        </div>
      </div>
      {summary && (
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#6b7280', margin: 0 }}>
            Manager scored
          </p>
          <p style={{ fontSize: 12, margin: '2px 0 0', color: summary.managerHasScored ? '#4ade80' : '#f59e0b' }}>
            {summary.managerHasScored ? '✓ Done' : '⚠ Not yet'}
          </p>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Run tests to confirm all pass**

```bash
npm test -- YourConnections
```

- [ ] **Step 6: Commit**

```bash
git add app/\(app\)/people/types.ts app/\(app\)/people/YourConnections.tsx __tests__/app/people/YourConnections.test.tsx
git commit -m "feat: add YourConnections component"
```

---

## Task 7: `OrgHierarchy` and `OrgSection` components

**Files:**
- Create: `components/org/OrgHierarchy.tsx`
- Create: `app/(app)/people/OrgSection.tsx`

- [ ] **Step 1: Create `components/org/OrgHierarchy.tsx`**

This component takes the flat `OrgNode[]` array, builds a tree, and renders it with:
- Collapse/expand toggles (for all users)
- Headcount per node (for all users)
- "See members" expandable inline list (org_admin only)
- Node admin controls: add child, rename, delete, add member (org_admin only)

The admin mutation server actions live in `app/(app)/organisation/actions.ts` and are imported here.

```typescript
'use client'
import { useState } from 'react'
import type { OrgNode } from '@/lib/db/org-nodes'
import {
  createNodeAction,
  renameNodeAction,
  deleteNodeAction,
  addMemberToNodeVoidAction,
  removeMemberFromNodeAction,
} from '@/app/(app)/organisation/actions'

interface OrgNodeWithChildren extends OrgNode {
  children: OrgNodeWithChildren[]
}

function buildTree(nodes: OrgNode[], parentId: string | null = null): OrgNodeWithChildren[] {
  return nodes
    .filter(n => n.parent_id === parentId)
    .map(n => ({ ...n, children: buildTree(nodes, n.id) }))
}

interface Props {
  nodes: OrgNode[]
  orgId: string
  orgRole: 'org_admin' | 'member' | null
}

export function OrgHierarchy({ nodes, orgId, orgRole }: Props) {
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set())
  const [expandedMemberIds, setExpandedMemberIds] = useState<Set<string>>(new Set())

  const isAdmin = orgRole === 'org_admin'
  const tree = buildTree(nodes)

  function toggleCollapse(id: string) {
    setCollapsedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleMembers(id: string) {
    setExpandedMemberIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function renderNode(node: OrgNodeWithChildren, depth: number) {
    const isCollapsed = collapsedIds.has(node.id)
    const membersExpanded = expandedMemberIds.has(node.id)

    return (
      <div key={node.id}>
        {/* Node row */}
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: `8px 14px 8px ${14 + depth * 18}px`,
            borderBottom: '1px solid rgba(255,255,255,0.04)',
          }}
        >
          {node.children.length > 0 ? (
            <button
              type="button"
              onClick={() => toggleCollapse(node.id)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: 0, fontSize: 12 }}
            >
              {isCollapsed ? '▸' : '▾'}
            </button>
          ) : (
            <span style={{ width: 16, flexShrink: 0 }} />
          )}

          <span style={{ flex: 1, fontSize: 13, color: '#f1f5f9', fontWeight: depth === 0 ? 600 : 400 }}>
            {node.name}
            {node.node_type && (
              <span style={{ marginLeft: 6, fontSize: 10, color: '#4b5563' }}>{node.node_type}</span>
            )}
          </span>

          <span style={{ fontSize: 11, color: '#6b7280' }}>{node.members.length} {node.members.length === 1 ? 'person' : 'people'}</span>

          {isAdmin && (
            <button
              type="button"
              onClick={() => toggleMembers(node.id)}
              style={{
                fontSize: 10, color: '#6366f1', cursor: 'pointer',
                border: '1px solid rgba(99,102,241,0.3)', padding: '2px 8px',
                borderRadius: 4, background: 'transparent',
              }}
            >
              {membersExpanded ? 'Hide members' : 'See members'}
            </button>
          )}
        </div>

        {/* Expanded member list (admin only) */}
        {isAdmin && membersExpanded && (
          <div
            style={{
              paddingLeft: 14 + depth * 18 + 22,
              paddingRight: 14, paddingTop: 6, paddingBottom: 10,
              background: 'rgba(99,102,241,0.04)',
              borderBottom: '1px solid rgba(255,255,255,0.04)',
            }}
          >
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
              {node.members.map(m => (
                <div
                  key={m.user_id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#cbd5e1',
                    background: 'rgba(255,255,255,0.04)', borderRadius: 6, padding: '3px 8px',
                  }}
                >
                  <div
                    style={{
                      width: 20, height: 20, borderRadius: '50%', background: '#374151',
                      border: '1px solid rgba(99,102,241,0.4)', display: 'flex',
                      alignItems: 'center', justifyContent: 'center', fontSize: 8, color: '#fff',
                      flexShrink: 0,
                    }}
                  >
                    {(m.display_name || m.email || '?').slice(0, 2).toUpperCase()}
                  </div>
                  {m.display_name || m.email}
                  <form action={removeMemberFromNodeAction} style={{ display: 'inline' }}>
                    <input type="hidden" name="nodeId" value={node.id} />
                    <input type="hidden" name="userId" value={m.user_id} />
                    <input type="hidden" name="orgId" value={orgId} />
                    <button type="submit" style={{ background: 'none', border: 'none', color: '#4b5563', cursor: 'pointer', fontSize: 11, padding: '0 2px' }}>✕</button>
                  </form>
                </div>
              ))}
            </div>
            {/* Add member to node form */}
            <form action={addMemberToNodeVoidAction} style={{ display: 'flex', gap: 6 }}>
              <input type="hidden" name="orgId" value={orgId} />
              <input type="hidden" name="nodeId" value={node.id} />
              <input
                name="email"
                type="email"
                placeholder="Add member by email"
                style={{
                  flex: 1, background: '#0d1117', border: '1px solid #1f2937', borderRadius: 5,
                  padding: '5px 8px', color: '#f1f5f9', fontSize: 12,
                }}
              />
              <button
                type="submit"
                style={{
                  padding: '5px 10px', background: 'rgba(99,102,241,0.2)',
                  color: '#a78bfa', border: '1px solid rgba(99,102,241,0.3)',
                  borderRadius: 5, fontSize: 11, cursor: 'pointer',
                }}
              >
                Add
              </button>
            </form>
          </div>
        )}

        {/* Admin: add child node form */}
        {isAdmin && !isCollapsed && (
          <div
            style={{
              paddingLeft: 14 + depth * 18 + 22,
              paddingBottom: 4,
              borderBottom: '1px solid rgba(255,255,255,0.02)',
            }}
          >
          </div>
        )}

        {/* Children */}
        {!isCollapsed && node.children.map(child => renderNode(child, depth + 1))}
      </div>
    )
  }

  return (
    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, overflow: 'hidden' }}>
      {tree.length === 0 ? (
        <p style={{ padding: '16px 14px', fontSize: 13, color: '#4b5563' }}>No structure defined yet.</p>
      ) : (
        tree.map(node => renderNode(node, 0))
      )}
      {isAdmin && (
        <div style={{ padding: '10px 14px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          <form action={createNodeAction} style={{ display: 'flex', gap: 6 }}>
            <input type="hidden" name="orgId" value={orgId} />
            <input
              name="name"
              placeholder="New top-level group"
              style={{
                flex: 1, background: '#0d1117', border: '1px solid #1f2937', borderRadius: 5,
                padding: '6px 10px', color: '#f1f5f9', fontSize: 12,
              }}
            />
            <button
              type="submit"
              style={{
                padding: '6px 12px', background: 'rgba(99,102,241,0.15)',
                color: '#a78bfa', border: '1px solid rgba(99,102,241,0.3)',
                borderRadius: 5, fontSize: 12, cursor: 'pointer',
              }}
            >
              + Add group
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create `app/(app)/people/OrgSection.tsx`**

```typescript
'use client'
import { useState } from 'react'
import { OrgHierarchy } from '@/components/org/OrgHierarchy'
import { createOrgAction } from '@/app/(app)/organisation/actions'
import type { Org } from '@/lib/db/organisations'
import type { OrgNode } from '@/lib/db/org-nodes'

interface Props {
  orgs: Org[]
  nodes: OrgNode[]
  orgRole: 'org_admin' | 'member' | null
}

export function OrgSection({ orgs, nodes, orgRole }: Props) {
  const [selectedOrgIndex, setSelectedOrgIndex] = useState(0)
  const selectedOrg = orgs[selectedOrgIndex] ?? null

  return (
    <section>
      <div
        style={{
          fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em',
          fontWeight: 600, color: '#a78bfa', marginBottom: 14,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}
      >
        <span>Organisation</span>
        {selectedOrg && (
          <span
            style={{
              fontSize: 10, background: 'rgba(99,102,241,0.15)',
              color: '#a78bfa', padding: '2px 8px', borderRadius: 4, fontWeight: 500,
            }}
          >
            {selectedOrg.name}
          </span>
        )}
      </div>

      {orgs.length === 0 ? (
        <div
          style={{
            background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 10, padding: 24,
          }}
        >
          <p style={{ fontSize: 14, color: '#9ca3af', marginBottom: 16 }}>
            You're not part of an organisation yet. Create one to map out your team structure.
          </p>
          <form action={createOrgAction} style={{ display: 'flex', gap: 8 }}>
            <input
              name="name"
              placeholder="Organisation name"
              required
              style={{
                flex: 1, background: '#0d1117', border: '1px solid #1f2937', borderRadius: 6,
                padding: '8px 12px', color: '#f1f5f9', fontSize: 14,
              }}
            />
            <button
              type="submit"
              style={{
                padding: '8px 18px', background: '#4f46e5', color: '#fff',
                fontWeight: 600, fontSize: 13, border: 'none', borderRadius: 6, cursor: 'pointer',
              }}
            >
              Create
            </button>
          </form>
        </div>
      ) : (
        <>
          {orgs.length > 1 && (
            <div style={{ display: 'flex', gap: 4, marginBottom: 14 }}>
              {orgs.map((org, i) => (
                <button
                  key={org.id}
                  type="button"
                  onClick={() => setSelectedOrgIndex(i)}
                  style={{
                    padding: '4px 12px', fontSize: 12, borderRadius: 4, cursor: 'pointer',
                    background: i === selectedOrgIndex ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.04)',
                    border: i === selectedOrgIndex ? '1px solid rgba(99,102,241,0.5)' : '1px solid rgba(255,255,255,0.08)',
                    color: i === selectedOrgIndex ? '#a78bfa' : '#6b7280',
                  }}
                >
                  {org.name}
                </button>
              ))}
            </div>
          )}
          {selectedOrg && (
            <OrgHierarchy
              nodes={nodes}
              orgId={selectedOrg.id}
              orgRole={orgRole}
            />
          )}
        </>
      )}
    </section>
  )
}
```

- [ ] **Step 3: Run full test suite**

```bash
npm test
```

- [ ] **Step 4: Commit**

```bash
git add components/org/OrgHierarchy.tsx app/\(app\)/people/OrgSection.tsx
git commit -m "feat: add OrgHierarchy and OrgSection components"
```

---

## Task 8: `/people` server page

**Files:**
- Create: `app/(app)/people/page.tsx`

- [ ] **Step 1: Create `app/(app)/people/page.tsx`**

```typescript
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getConnectionsForUser } from '@/lib/db/connections'
import { getOrgsForUser } from '@/lib/db/organisations'
import { getNodesForOrg } from '@/lib/db/org-nodes'
import { getOrgRole } from '@/lib/auth/roles'
import { getDirectReportRoundSummaries } from '@/lib/db/direct-reports'
import type { EnrichedConnection } from './types'
import { YourConnections } from './YourConnections'
import { OrgSection } from './OrgSection'

export const metadata = { title: 'Team & Org' }

export default async function PeoplePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [connections, orgs] = await Promise.all([
    getConnectionsForUser(user.id),
    getOrgsForUser(user.id),
  ])

  const directReportIds = (connections.asManager as EnrichedConnection[])
    .filter(c => c.status === 'active')
    .map(c => c.direct_report_id)

  const selectedOrg = orgs[0] ?? null

  const [roundSummaries, nodes, orgRole] = await Promise.all([
    directReportIds.length > 0 ? getDirectReportRoundSummaries(directReportIds) : Promise.resolve({}),
    selectedOrg ? getNodesForOrg(selectedOrg.id) : Promise.resolve([]),
    selectedOrg ? getOrgRole(user.id, selectedOrg.id) : Promise.resolve(null),
  ])

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-8 text-2xl font-bold text-white">Team &amp; Org</h1>

      <YourConnections
        connections={connections as { asManager: EnrichedConnection[]; asDirectReport: EnrichedConnection[] }}
        roundSummaries={roundSummaries}
        userId={user.id}
      />

      <div style={{ margin: '32px 0', borderTop: '1px solid rgba(255,255,255,0.07)' }} />

      <OrgSection
        orgs={orgs}
        nodes={nodes}
        orgRole={orgRole}
      />
    </div>
  )
}
```

- [ ] **Step 2: Verify the page compiles**

```bash
npm run build 2>&1 | grep -E "error|Error|✓" | head -30
```
Expected: no TypeScript errors for the people page.

- [ ] **Step 3: Start dev server and verify the page loads**

```bash
npm run dev
```
Open http://localhost:3000/people — should render without crashing. Check Your Connections and Organisation sections.

- [ ] **Step 4: Commit**

```bash
git add app/\(app\)/people/
git commit -m "feat: add /people server page"
```

---

## Task 9: Nav, middleware, and Topbar updates

**Files:**
- Modify: `components/app/Sidebar.tsx`
- Modify: `components/app/Topbar.tsx`
- Modify: `components/layout/nav.tsx`
- Modify: `middleware.ts`

- [ ] **Step 1: Update `components/app/Sidebar.tsx`**

Replace the two nav items with one:

```typescript
// Replace:
  { href: '/connections', icon: Link2, label: 'Connections', id: 'nav-connections' },
  { href: '/organisation', icon: Network, label: 'Organisation' },
// With:
  { href: '/people', icon: Network, label: 'Team & Org', id: 'nav-people' },
```

Remove the `Link2` import if it is no longer used anywhere else in the file.

- [ ] **Step 2: Update `components/app/Topbar.tsx`**

Find the route-label map (line 9: `'/connections': 'Connections'`) and update it:

```typescript
// Remove:
  '/connections': 'Connections',
// Add:
  '/people': 'Team & Org',
```

Also remove any `/organisation` entry if present.

- [ ] **Step 3: Update `components/layout/nav.tsx`**

Replace `/connections` with `/people` in the array (line 22):

```typescript
// Remove:
  '/connections',
// Add:
  '/people',
```

- [ ] **Step 4: Update `middleware.ts`**

```typescript
// Replace the APP_ROUTES array:
const APP_ROUTES = [
  '/dashboard',
  '/scorecard',
  '/results',
  '/people',
  '/manager',
  '/growth',
  '/profile',
  '/notifications',
]
```

(Remove `/connections` and `/organisation`; add `/people`.)

- [ ] **Step 5: Run tests and build check**

```bash
npm test && npm run build 2>&1 | grep -E "error|Error" | head -20
```

- [ ] **Step 6: Commit**

```bash
git add components/app/Sidebar.tsx components/app/Topbar.tsx components/layout/nav.tsx middleware.ts
git commit -m "feat: update nav and middleware for /people route"
```

---

## Task 10: Dashboard invite modal

**Files:**
- Modify: `components/dashboard/DashboardResults.tsx`

The "Invite your manager" card at line ~97 currently renders a `<Link href="/connections">`. Replace it with `<InviteManagerModal>`.

- [ ] **Step 1: Edit `components/dashboard/DashboardResults.tsx`**

Add import at top of file:
```typescript
import { InviteManagerModal } from '@/components/people/InviteManagerModal'
```

Replace the entire `{!hasManagerScores && (...)}` block (lines ~97–113) with:

```typescript
{!hasManagerScores && (
  <div
    className="rounded-xl px-5 py-4"
    style={{ background: '#1e3a5f', border: '1px solid rgba(245,158,11,0.2)' }}
  >
    <p className="mb-1 text-sm font-semibold text-white">Invite your manager</p>
    <p className="mb-3 text-xs text-slate-400">
      They score you independently, then you compare.
    </p>
    <InviteManagerModal />
  </div>
)}
```

- [ ] **Step 2: Run tests**

```bash
npm test
```

- [ ] **Step 3: Verify in dev server**

Start `npm run dev`, navigate to `/dashboard` as a user without manager scores. The "Invite your manager" card should render. Clicking "Connect →" should open the modal (not navigate to /connections).

- [ ] **Step 4: Commit**

```bash
git add components/dashboard/DashboardResults.tsx
git commit -m "feat: replace dashboard invite link with InviteManagerModal"
```

---

## Task 11: Route redirects and org actions cleanup

**Files:**
- Modify: `app/(app)/connections/page.tsx`
- Modify: `app/(app)/organisation/page.tsx`
- Modify: `app/(app)/organisation/actions.ts`

- [ ] **Step 1: Replace `app/(app)/connections/page.tsx` with a redirect**

```typescript
import { redirect } from 'next/navigation'
export default function ConnectionsPage() {
  redirect('/people')
}
```

- [ ] **Step 2: Replace `app/(app)/organisation/page.tsx` with a redirect**

```typescript
import { redirect } from 'next/navigation'
export default function OrganisationPage() {
  redirect('/people')
}
```

- [ ] **Step 3: Update `requireOrgAdmin` in `app/(app)/organisation/actions.ts`**

Line 22: Change `redirect('/organisation')` to `redirect('/people')`:

```typescript
async function requireOrgAdmin(orgId: string) {
  const user = await getUser()
  const role = await getOrgRole(user.id, orgId)
  if (role !== 'org_admin') redirect('/people')
  return user
}
```

Also update `revalidatePath('/organisation')` calls in all actions in this file to `revalidatePath('/people')`.

- [ ] **Step 4: Run tests and build**

```bash
npm test && npm run build 2>&1 | grep -E "error|Error" | head -20
```

- [ ] **Step 5: Commit**

```bash
git add app/\(app\)/connections/page.tsx app/\(app\)/organisation/page.tsx app/\(app\)/organisation/actions.ts
git commit -m "feat: redirect /connections and /organisation to /people, update org action paths"
```

---

## Task 12: Super Admin organisations table enhancement

**Files:**
- Modify: `app/(app)/admin/organisations/page.tsx`

Add three new columns: **Org Admins** (display_name instead of email), **Nodes** (count of `org_nodes`), and **Last Activity** (most recent `completed_at` across any `assessment_rounds` in the org).

- [ ] **Step 1: Update `app/(app)/admin/organisations/page.tsx`**

Replace the file entirely:

```typescript
import { createAdminClient } from '@/lib/supabase/admin'
import { deleteOrgAction } from './actions'

interface OrgRow {
  id: string
  name: string
  created_at: string
  org_members: {
    role: string
    profiles: { email: string | null; display_name: string | null }[]
  }[]
  org_nodes: { id: string }[]
}

export default async function AdminOrganisationsPage() {
  const supabase = createAdminClient()

  const { data } = await supabase
    .from('organisations')
    .select(
      'id, name, created_at, org_members(role, profiles(email, display_name)), org_nodes(id)'
    )
    .order('created_at', { ascending: false })

  const orgs = (data ?? []) as OrgRow[]

  // Fetch last activity per org: most recent completed_at among any org member's assessment rounds
  const lastActivityMap: Record<string, string | null> = {}

  await Promise.all(
    orgs.map(async (org) => {
      const { data: memberRows } = await supabase
        .from('org_members')
        .select('user_id')
        .eq('org_id', org.id)

      const userIds = (memberRows ?? []).map((m: { user_id: string }) => m.user_id)
      if (userIds.length === 0) {
        lastActivityMap[org.id] = null
        return
      }

      const { data: roundRows } = await supabase
        .from('assessment_rounds')
        .select('completed_at')
        .in('user_id', userIds)
        .eq('status', 'complete')
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false })
        .limit(1)

      lastActivityMap[org.id] = roundRows?.[0]?.completed_at ?? null
    })
  )

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="mb-6 text-2xl font-bold text-white">Organisations</h1>
      <div className="overflow-hidden rounded-xl" style={{ border: '1px solid #1f2937' }}>
        <table className="w-full text-sm">
          <thead style={{ background: '#111827' }}>
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">Admin(s)</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">Members</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">Nodes</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">Last Activity</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">Created</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody style={{ background: '#0d1117' }}>
            {orgs.map(org => {
              const admins = org.org_members.filter(m => m.role === 'org_admin')
              const lastActivity = lastActivityMap[org.id]
              return (
                <tr key={org.id} style={{ borderTop: '1px solid #1f2937' }}>
                  <td className="px-4 py-3 font-medium text-white">{org.name}</td>
                  <td className="px-4 py-3 text-slate-400">
                    {admins.length > 0
                      ? admins.map(a => a.profiles[0]?.display_name ?? a.profiles[0]?.email ?? '—').join(', ')
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-400">{org.org_members.length}</td>
                  <td className="px-4 py-3 text-slate-400">{org.org_nodes.length}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {lastActivity
                      ? new Date(lastActivity).toLocaleDateString()
                      : <span className="text-slate-600">No activity</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {new Date(org.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <form action={deleteOrgAction}>
                      <input type="hidden" name="orgId" value={org.id} />
                      <button
                        type="submit"
                        className="text-xs text-red-500 underline hover:text-red-400"
                      >
                        Delete
                      </button>
                    </form>
                  </td>
                </tr>
              )
            })}
            {orgs.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                  No organisations yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Run full test suite**

```bash
npm test
```

- [ ] **Step 3: Build check**

```bash
npm run build 2>&1 | grep -E "error|Error" | head -20
```

- [ ] **Step 4: Commit**

```bash
git add app/\(app\)/admin/organisations/page.tsx
git commit -m "feat: add Nodes, Last Activity, and display_name to admin orgs table"
```

---

## Final verification

- [ ] Run `npm test` — all tests pass, no regressions
- [ ] Run `npm run build` — clean build, no TypeScript errors
- [ ] Start `npm run dev` and manually verify:
  - `/people` loads with Your Connections + Organisation sections
  - Sidebar shows "Team & Org" (not Connections / Organisation)
  - `/connections` and `/organisation` redirect to `/people`
  - Dashboard "Invite your manager" opens modal (not navigates)
  - Super Admin `/admin/organisations` shows new columns
- [ ] `git status` — only intended files modified
