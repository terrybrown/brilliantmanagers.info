# Manager Experience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the manager-aware experience — email notifications for all four notification types, polished ManagerStrip card grid, manager first-access dashboard empty state, and per-round team reflections section.

**Architecture:** Four sequentially-mergeable PRs matching the spec. Most of PR 1 (data model, in-app notifications) and all of PR 3 (informed/blind scoring) are already shipped. This plan covers the remaining work: email functions for 3 notification types (PR 1), ManagerStrip visual redesign + dashboard empty state (PR 2), and multi-round TeamReflectionsSection (PR 4).

**Tech Stack:** Next.js 15 App Router, Supabase (Postgres + RLS + admin client), TypeScript, Vitest + Testing Library, Tailwind CSS v4, Mailgun (`lib/email/mailgun.ts`), Sonner toasts, Lucide React icons

---

## Codebase context (read before starting)

Key locations the implementer must know:

- `Level`, `PILLARS`, `getSkillsByPillar`, `LEVEL_VALUES` → `lib/skills.ts`
- `Profile` (fields include `id`, `display_name`, `email`, `email_notifications_enabled`) → `lib/db/profiles.ts`
- `getProfile(userId): Promise<Profile | null>` → `lib/db/profiles.ts`
- `sendEmail({ to, subject, html })` → `lib/email/mailgun.ts`
- `DirectReportRoundSummary` (fields: `roundStatus: 'in_progress'|'scheduled'|'none'`, `lastScore`, `nextScheduledDate`, `managerScoringStatus: 'not_started'|'in_progress'|'complete'`, `roundId: string|null`, `completedAt: string|null`, `pillarsScored: number`) → `lib/db/direct-reports.ts`
- `EnrichedDRSummary = DirectReportRoundSummary & { userId: string; name: string }` → exported from `components/dashboard/ManagerStrip.tsx`
- `TeamReflectionSummary` (current shape, one entry per DR with latest round) → `lib/db/direct-reports.ts`
- `createNotification`, `getNotifications`, `getUnreadCount`, `markAllRead` → `lib/notifications.ts`
- `Notification` type (fields: `id`, `userId`, `type: NotificationType`, `payload: Record<string, unknown>`, `readAt: string|null`, `createdAt: string`) → `lib/notifications.ts`
- `roundLabel(round: Round): string` → `lib/reflections.ts` (returns `round.title` or `"QN YYYY"`)
- `ActionResult<T>`, `ok()`, `err()` → `lib/action-result.ts`
- `useMutation({ onSuccess })` → `hooks/use-mutation.ts`
- Test runner: Vitest (`npm test`). Test files live in `__tests__/`, mirroring source.

**Already shipped (do NOT re-implement):**
- DB migration: `scheduled` round status, `email_notifications_enabled`, `manager_scoring_blind`, `notifications` table with RLS
- `lib/notifications.ts` — all CRUD functions
- `lib/email/notifications.ts` — `sendManagerScoringNeededEmail` (manager scoring trigger only)
- `scorecard/actions.ts` — fires `manager_scoring_needed` in-app notification + email
- `connections/actions.ts` — fires `connection_request_received` and `connection_accepted` in-app notifications (emails NOT yet wired)
- `reflections/actions.ts` — fires `round_scheduled` in-app notification (email NOT yet wired)
- Notifications page + `NotificationsList` component (basic — icons/descriptions being improved in Task 4)
- Sidebar unread badge, layout `getUnreadCount`
- `getDirectReportRoundSummaries` — returns all needed fields
- `ManagerStrip` — functional list (being visually redesigned in Task 5)
- `DashboardManagerTour` — complete, no changes needed
- Dashboard page — manager state detection, renders ManagerStrip + tour (empty state being improved in Task 6)
- `manager/[userId]` page — roundId param, scheduled state, informed/blind mode — complete
- `ManagerScoringView` + `SkillCard` drScore badge — complete, no changes needed
- Profile page `manager_scoring_blind` toggle — complete
- `getTeamReflectionSummaries` (current shape, one round per DR — being extended in Task 7)
- `TeamReflectionsSection` (basic list — being redesigned in Task 8)
- `.gitignore` `.superpowers/` entry — present

---

## PR 1 — Email notifications for 3 remaining types

Create feature branch first:

```bash
git checkout master && git pull
git checkout -b feat/manager-experience-pr1
```

---

### Task 1: Confirm baseline test suite is green

**Files:** none

- [ ] **Step 1: Run the full test suite**

```bash
npm test
```

Expected: all tests pass. If any fail, fix them before proceeding — do not start new work on a broken baseline.

---

### Task 2: Email functions for connection and round notifications

**Files:**
- Modify: `lib/email/notifications.ts`
- Create: `__tests__/lib/email/notifications.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/lib/email/notifications.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db/profiles', () => ({ getProfile: vi.fn() }))
vi.mock('@/lib/email/mailgun', () => ({ sendEmail: vi.fn() }))

import { getProfile } from '@/lib/db/profiles'
import { sendEmail } from '@/lib/email/mailgun'
import {
  sendConnectionRequestEmail,
  sendConnectionAcceptedEmail,
  sendRoundScheduledEmail,
} from '@/lib/email/notifications'

const mockGetProfile = vi.mocked(getProfile)
const mockSendEmail = vi.mocked(sendEmail)

const ENABLED_PROFILE = {
  id: 'u1',
  display_name: 'Alex',
  email: 'alex@example.com',
  email_notifications_enabled: true,
  manager_scoring_blind: false,
  job_title: null,
  bio: null,
  avatar_path: null,
  created_at: '2026-01-01T00:00:00Z',
}

beforeEach(() => vi.clearAllMocks())

describe('sendConnectionRequestEmail', () => {
  it('sends email when notifications enabled', async () => {
    mockGetProfile.mockResolvedValue(ENABLED_PROFILE)
    mockSendEmail.mockResolvedValue(undefined)

    await sendConnectionRequestEmail('u1', 'Jamie')

    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'alex@example.com',
        subject: expect.stringContaining('Jamie'),
      })
    )
  })

  it('skips email when notifications disabled', async () => {
    mockGetProfile.mockResolvedValue({
      ...ENABLED_PROFILE,
      email_notifications_enabled: false,
    })

    await sendConnectionRequestEmail('u1', 'Jamie')

    expect(mockSendEmail).not.toHaveBeenCalled()
  })

  it('skips email when profile has no email', async () => {
    mockGetProfile.mockResolvedValue({ ...ENABLED_PROFILE, email: null })

    await sendConnectionRequestEmail('u1', 'Jamie')

    expect(mockSendEmail).not.toHaveBeenCalled()
  })

  it('does not throw when sendEmail rejects', async () => {
    mockGetProfile.mockResolvedValue(ENABLED_PROFILE)
    mockSendEmail.mockRejectedValue(new Error('Mailgun down'))

    await expect(sendConnectionRequestEmail('u1', 'Jamie')).resolves.toBeUndefined()
  })
})

describe('sendConnectionAcceptedEmail', () => {
  it('sends email when notifications enabled', async () => {
    mockGetProfile.mockResolvedValue(ENABLED_PROFILE)
    mockSendEmail.mockResolvedValue(undefined)

    await sendConnectionAcceptedEmail('u1', 'Sam')

    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'alex@example.com',
        subject: expect.stringContaining('Sam'),
      })
    )
  })

  it('skips email when notifications disabled', async () => {
    mockGetProfile.mockResolvedValue({
      ...ENABLED_PROFILE,
      email_notifications_enabled: false,
    })

    await sendConnectionAcceptedEmail('u1', 'Sam')

    expect(mockSendEmail).not.toHaveBeenCalled()
  })

  it('does not throw when sendEmail rejects', async () => {
    mockGetProfile.mockResolvedValue(ENABLED_PROFILE)
    mockSendEmail.mockRejectedValue(new Error('Mailgun down'))

    await expect(sendConnectionAcceptedEmail('u1', 'Sam')).resolves.toBeUndefined()
  })
})

describe('sendRoundScheduledEmail', () => {
  it('sends email when notifications enabled', async () => {
    mockGetProfile.mockResolvedValue(ENABLED_PROFILE)
    mockSendEmail.mockResolvedValue(undefined)

    await sendRoundScheduledEmail('u1', '2026-06-15')

    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'alex@example.com',
        subject: expect.stringContaining('2026-06-15'),
      })
    )
  })

  it('skips email when notifications disabled', async () => {
    mockGetProfile.mockResolvedValue({
      ...ENABLED_PROFILE,
      email_notifications_enabled: false,
    })

    await sendRoundScheduledEmail('u1', '2026-06-15')

    expect(mockSendEmail).not.toHaveBeenCalled()
  })

  it('does not throw when sendEmail rejects', async () => {
    mockGetProfile.mockResolvedValue(ENABLED_PROFILE)
    mockSendEmail.mockRejectedValue(new Error('Mailgun down'))

    await expect(sendRoundScheduledEmail('u1', '2026-06-15')).resolves.toBeUndefined()
  })
})
```

- [ ] **Step 2: Run to verify tests fail**

```bash
npm test -- __tests__/lib/email/notifications.test.ts
```

Expected: FAIL — `sendConnectionRequestEmail`, `sendConnectionAcceptedEmail`, `sendRoundScheduledEmail` not exported.

- [ ] **Step 3: Implement the three functions**

Append to `lib/email/notifications.ts`:

```ts
export async function sendConnectionRequestEmail(
  recipientId: string,
  fromName: string
): Promise<void> {
  const profile = await getProfile(recipientId)
  if (!profile?.email) return
  if (!profile.email_notifications_enabled) return
  try {
    await sendEmail({
      to: profile.email,
      subject: `${fromName} wants to connect on Brilliant Managers`,
      html: `<p>Hi ${profile.display_name ?? ''},</p>
<p>${fromName} has sent you a connection request on Brilliant Managers. <a href="https://brilliantmanagers.info/people">Log in to accept or decline.</a></p>`,
    })
  } catch (e) {
    console.error('Failed to send connection request email:', e)
  }
}

export async function sendConnectionAcceptedEmail(
  recipientId: string,
  byName: string
): Promise<void> {
  const profile = await getProfile(recipientId)
  if (!profile?.email) return
  if (!profile.email_notifications_enabled) return
  try {
    await sendEmail({
      to: profile.email,
      subject: `${byName} accepted your connection request`,
      html: `<p>Hi ${profile.display_name ?? ''},</p>
<p>${byName} accepted your connection request on Brilliant Managers. <a href="https://brilliantmanagers.info/people">View your connections.</a></p>`,
    })
  } catch (e) {
    console.error('Failed to send connection accepted email:', e)
  }
}

export async function sendRoundScheduledEmail(
  recipientId: string,
  scheduledDate: string
): Promise<void> {
  const profile = await getProfile(recipientId)
  if (!profile?.email) return
  if (!profile.email_notifications_enabled) return
  try {
    await sendEmail({
      to: profile.email,
      subject: `Your next reflection round is scheduled for ${scheduledDate}`,
      html: `<p>Hi ${profile.display_name ?? ''},</p>
<p>Your next reflection round is scheduled for ${scheduledDate}. <a href="https://brilliantmanagers.info/scorecard">Head to your scorecard when you're ready.</a></p>`,
    })
  } catch (e) {
    console.error('Failed to send round scheduled email:', e)
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- __tests__/lib/email/notifications.test.ts
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/email/notifications.ts __tests__/lib/email/notifications.test.ts
git commit -m "feat: add email functions for connection and round notifications"
```

---

### Task 3: Wire email calls in connection and reflection actions

**Files:**
- Modify: `app/(app)/connections/actions.ts`
- Modify: `app/(app)/reflections/actions.ts`

- [ ] **Step 1: Wire connection email calls**

In `app/(app)/connections/actions.ts`, add the missing email import and two `void` calls.

Add import (alongside the existing `createNotification` import):
```ts
import { sendConnectionRequestEmail, sendConnectionAcceptedEmail } from '@/lib/email/notifications'
```

In `inviteConnection`, the block that fires `connection_request_received` notification currently looks like:
```ts
  // Notify the other party that they received a connection request
  const otherUserId = role === 'manager' ? directReportId : managerId
  if (otherUserId) {
    const fromName = await getDisplayName(supabase, user.id, user.email ?? 'A colleague')
    await createNotification(otherUserId, 'connection_request_received', {
      requesterId: user.id,
      requesterName: fromName,
    })
  }
```

Add `void sendConnectionRequestEmail(...)` immediately after `createNotification`:
```ts
  const otherUserId = role === 'manager' ? directReportId : managerId
  if (otherUserId) {
    const fromName = await getDisplayName(supabase, user.id, user.email ?? 'A colleague')
    await createNotification(otherUserId, 'connection_request_received', {
      requesterId: user.id,
      requesterName: fromName,
    })
    void sendConnectionRequestEmail(otherUserId, fromName)
  }
```

In `acceptConnectionAction`, the block that fires `connection_accepted` notification currently looks like:
```ts
  if (conn && conn.initiated_by !== user.id) {
    const acceptorName = await getDisplayName(supabase, user.id, user.email ?? 'A colleague')
    await createNotification(conn.initiated_by, 'connection_accepted', {
      acceptorId: user.id,
      acceptorName,
    })
  }
```

Add `void sendConnectionAcceptedEmail(...)` after `createNotification`:
```ts
  if (conn && conn.initiated_by !== user.id) {
    const acceptorName = await getDisplayName(supabase, user.id, user.email ?? 'A colleague')
    await createNotification(conn.initiated_by, 'connection_accepted', {
      acceptorId: user.id,
      acceptorName,
    })
    void sendConnectionAcceptedEmail(conn.initiated_by, acceptorName)
  }
```

- [ ] **Step 2: Wire round scheduled email call**

In `app/(app)/reflections/actions.ts`, add import:
```ts
import { sendRoundScheduledEmail } from '@/lib/email/notifications'
```

In `scheduleRoundAction`, the notification call is at line 61:
```ts
  await createNotification(userId, 'round_scheduled', { scheduledDate })
  return ok()
```

Add the email call after the notification:
```ts
  await createNotification(userId, 'round_scheduled', { scheduledDate })
  void sendRoundScheduledEmail(userId, scheduledDate)
  return ok()
```

- [ ] **Step 3: Run the full test suite**

```bash
npm test
```

Expected: all tests pass. The new imports don't require test changes since the existing tests mock the `createNotification` and `sendEmail` modules independently.

- [ ] **Step 4: Commit**

```bash
git add app/\(app\)/connections/actions.ts app/\(app\)/reflections/actions.ts
git commit -m "feat: wire email calls for connection and round notifications"
```

---

### Task 4: Improve NotificationsList with icons, descriptions, and unread styling

**Files:**
- Modify: `components/notifications/NotificationsList.tsx`
- Create: `__tests__/components/notifications/NotificationsList.test.tsx`

The notification payload keys currently stored (from inspecting the action files):
- `manager_scoring_needed`: `{ directReportId, directReportName, roundId }`
- `connection_request_received`: `{ requesterId, requesterName }`
- `connection_accepted`: `{ acceptorId, acceptorName }`
- `round_scheduled`: `{ scheduledDate }`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/components/notifications/NotificationsList.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { NotificationsList } from '@/components/notifications/NotificationsList'
import type { Notification } from '@/lib/notifications'

vi.mock('@/app/(app)/notifications/actions', () => ({
  markAllReadAction: vi.fn().mockResolvedValue(undefined),
}))

const MANAGER_SCORING: Notification = {
  id: 'n1',
  userId: 'u1',
  type: 'manager_scoring_needed',
  payload: { directReportId: 'dr1', directReportName: 'Alice', roundId: 'r1' },
  readAt: null,
  createdAt: new Date(Date.now() - 3600_000).toISOString(),
}

const CONNECTION_REQUEST: Notification = {
  id: 'n2',
  userId: 'u1',
  type: 'connection_request_received',
  payload: { requesterId: 'u2', requesterName: 'Bob' },
  readAt: null,
  createdAt: new Date(Date.now() - 7200_000).toISOString(),
}

const CONNECTION_ACCEPTED: Notification = {
  id: 'n3',
  userId: 'u1',
  type: 'connection_accepted',
  payload: { acceptorId: 'u3', acceptorName: 'Carol' },
  readAt: '2026-05-20T12:00:00Z',
  createdAt: new Date(Date.now() - 86400_000).toISOString(),
}

const ROUND_SCHEDULED: Notification = {
  id: 'n4',
  userId: 'u1',
  type: 'round_scheduled',
  payload: { scheduledDate: '2026-07-01' },
  readAt: null,
  createdAt: new Date(Date.now() - 172800_000).toISOString(),
}

describe('NotificationsList', () => {
  it('renders empty state when no notifications', () => {
    render(<NotificationsList notifications={[]} />)
    expect(screen.getByText(/all caught up/i)).toBeInTheDocument()
  })

  it('renders manager_scoring_needed with DR name in description', () => {
    render(<NotificationsList notifications={[MANAGER_SCORING]} />)
    expect(screen.getByText(/alice/i)).toBeInTheDocument()
  })

  it('links manager_scoring_needed to manager scoring page', () => {
    render(<NotificationsList notifications={[MANAGER_SCORING]} />)
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', expect.stringContaining('/manager/dr1'))
  })

  it('renders connection_request_received with requester name', () => {
    render(<NotificationsList notifications={[CONNECTION_REQUEST]} />)
    expect(screen.getByText(/bob/i)).toBeInTheDocument()
  })

  it('renders connection_accepted with acceptor name', () => {
    render(<NotificationsList notifications={[CONNECTION_ACCEPTED]} />)
    expect(screen.getByText(/carol/i)).toBeInTheDocument()
  })

  it('renders round_scheduled with date', () => {
    render(<NotificationsList notifications={[ROUND_SCHEDULED]} />)
    expect(screen.getByText(/2026-07-01/i)).toBeInTheDocument()
  })

  it('unread rows have amber left border', () => {
    const { container } = render(<NotificationsList notifications={[MANAGER_SCORING]} />)
    const row = container.querySelector('[data-testid="notification-row"]')
    expect(row?.className).toMatch(/border-l-amber/)
  })

  it('read rows do not have amber left border', () => {
    const { container } = render(<NotificationsList notifications={[CONNECTION_ACCEPTED]} />)
    const row = container.querySelector('[data-testid="notification-row"]')
    expect(row?.className).not.toMatch(/border-l-amber/)
  })
})
```

- [ ] **Step 2: Run to verify tests fail**

```bash
npm test -- __tests__/components/notifications/NotificationsList.test.tsx
```

Expected: FAIL — descriptions and `data-testid` not present.

- [ ] **Step 3: Replace NotificationsList with improved version**

Replace the entire content of `components/notifications/NotificationsList.tsx`:

```tsx
'use client'
import { useEffect, useTransition } from 'react'
import { Bell, UserPlus, UserCheck, Calendar, ClipboardCheck } from 'lucide-react'
import { markAllReadAction } from '@/app/(app)/notifications/actions'
import type { Notification, NotificationType } from '@/lib/notifications'

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function getNotificationHref(n: Notification): string {
  if (n.type === 'manager_scoring_needed') {
    const drId = typeof n.payload.directReportId === 'string' ? n.payload.directReportId : ''
    const roundId = typeof n.payload.roundId === 'string' ? n.payload.roundId : ''
    return roundId ? `/manager/${drId}?roundId=${roundId}` : `/manager/${drId}`
  }
  const links: Record<NotificationType, string> = {
    manager_scoring_needed: '/people',
    connection_request_received: '/people',
    connection_accepted: '/people',
    round_scheduled: '/scorecard',
  }
  return links[n.type] ?? '/'
}

function getNotificationDescription(n: Notification): string {
  const p = n.payload
  switch (n.type) {
    case 'manager_scoring_needed': {
      const name = typeof p.directReportName === 'string' ? p.directReportName : 'Your direct report'
      return `${name} completed their self-assessment. Score them now →`
    }
    case 'connection_request_received': {
      const name = typeof p.requesterName === 'string' ? p.requesterName : 'Someone'
      return `${name} wants to connect on Brilliant Managers`
    }
    case 'connection_accepted': {
      const name = typeof p.acceptorName === 'string' ? p.acceptorName : 'Someone'
      return `${name} accepted your connection request`
    }
    case 'round_scheduled': {
      const date = typeof p.scheduledDate === 'string' ? p.scheduledDate : 'soon'
      return `Your next reflection round is scheduled for ${date}`
    }
    default:
      return 'New notification'
  }
}

const ICONS: Record<NotificationType, React.ReactNode> = {
  manager_scoring_needed: <ClipboardCheck className="h-4 w-4 text-amber-400 flex-shrink-0" />,
  connection_request_received: <UserPlus className="h-4 w-4 text-blue-400 flex-shrink-0" />,
  connection_accepted: <UserCheck className="h-4 w-4 text-green-400 flex-shrink-0" />,
  round_scheduled: <Calendar className="h-4 w-4 text-purple-400 flex-shrink-0" />,
}

export function NotificationsList({ notifications }: { notifications: Notification[] }) {
  const [, startTransition] = useTransition()

  useEffect(() => {
    if (notifications.some(n => !n.readAt)) {
      startTransition(() => { markAllReadAction() })
    }
  }, [notifications])

  if (notifications.length === 0) {
    return (
      <div className="flex items-center gap-2 py-8 text-neutral-500">
        <Bell className="h-4 w-4" />
        <p className="text-sm">You&apos;re all caught up.</p>
      </div>
    )
  }

  return (
    <ul className="space-y-2">
      {notifications.map(n => {
        const isUnread = !n.readAt
        return (
          <li key={n.id}>
            <a
              href={getNotificationHref(n)}
              data-testid="notification-row"
              className={[
                'flex items-start gap-3 rounded-lg border p-4 transition-colors',
                isUnread
                  ? 'border-l-4 border-l-amber-500 border-neutral-800 bg-neutral-800/60 hover:border-neutral-600'
                  : 'border-neutral-800 hover:border-neutral-600',
              ].join(' ')}
            >
              <div className="mt-0.5">{ICONS[n.type] ?? <Bell className="h-4 w-4 flex-shrink-0" />}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-neutral-100">{getNotificationDescription(n)}</p>
                <p className="text-xs text-neutral-500 mt-0.5">{formatRelativeTime(n.createdAt)}</p>
              </div>
              {isUnread && (
                <span className="mt-1.5 h-2 w-2 rounded-full bg-amber-500 flex-shrink-0" />
              )}
            </a>
          </li>
        )
      })}
    </ul>
  )
}
```

- [ ] **Step 4: Run tests**

```bash
npm test -- __tests__/components/notifications/NotificationsList.test.tsx
```

Expected: all tests pass.

- [ ] **Step 5: Run full suite**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add components/notifications/NotificationsList.tsx __tests__/components/notifications/NotificationsList.test.tsx
git commit -m "feat: improve NotificationsList with icons, descriptions, and unread styling"
```

---

### PR 1 wrap-up

- [ ] **Run lint and build**

```bash
npm run lint && npm run build
```

Fix any errors. Then raise PR targeting `master`.

---

## PR 2 — Manager Dashboard Strip & Empty State

Create a new feature branch (do NOT build on the PR 1 branch):

```bash
git checkout master && git pull
git checkout -b feat/manager-experience-pr2
```

---

### Task 5: ManagerStrip visual redesign — card grid with progress bars

**Files:**
- Modify: `components/dashboard/ManagerStrip.tsx`
- Modify: `__tests__/components/dashboard/ManagerStrip.test.tsx`

The current `ManagerStrip` is a plain list. Replace it with the amber-tinted container + card grid specified in the design.

Data available in `EnrichedDRSummary`:
- `userId: string`
- `name: string`
- `roundId: string | null`
- `managerScoringStatus: 'not_started' | 'in_progress' | 'complete'`
- `pillarsScored: number` (0–5)
- `completedAt: string | null`
- `roundStatus: 'in_progress' | 'scheduled' | 'none'`

Cards to show: only DRs where `roundId !== null` (there is something to score — a complete or in_progress round). DRs where `roundId === null` have no scoreable round yet and are omitted.

`canScore` is removed — managers can score any state (in_progress or complete rounds).

Card visual states:
- `not_started`: amber progress bar at 0%, amber border, text "Not scored"
- `in_progress`: blue progress bar at `pillarsScored/5 * 100%`, blue border, text "N of 5 pillars"
- `complete`: green progress bar at 100%, muted green border, text "✓ Fully scored", no link (muted card)

- [ ] **Step 1: Update tests to match new design**

Replace `__tests__/components/dashboard/ManagerStrip.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ManagerStrip, type EnrichedDRSummary } from '@/components/dashboard/ManagerStrip'

const BASE: EnrichedDRSummary = {
  userId: 'dr-1',
  name: 'Alice Smith',
  roundStatus: 'complete',
  lastScore: null,
  nextScheduledDate: null,
  managerScoringStatus: 'not_started',
  roundId: 'round-1',
  completedAt: '2026-05-01T00:00:00Z',
  pillarsScored: 0,
}

describe('ManagerStrip', () => {
  it('renders null when no summaries have a round', () => {
    const noRound = { ...BASE, roundId: null }
    const { container } = render(<ManagerStrip summaries={[noRound]} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders null when summaries array is empty', () => {
    const { container } = render(<ManagerStrip summaries={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders direct report name', () => {
    render(<ManagerStrip summaries={[BASE]} />)
    expect(screen.getByText('Alice Smith')).toBeInTheDocument()
  })

  it('shows "Start →" link to manager scoring page when not_started', () => {
    render(<ManagerStrip summaries={[BASE]} />)
    const link = screen.getByRole('link', { name: /start/i })
    expect(link).toHaveAttribute('href', '/manager/dr-1?roundId=round-1')
  })

  it('shows "Continue →" link when in_progress', () => {
    render(<ManagerStrip summaries={[{ ...BASE, managerScoringStatus: 'in_progress', pillarsScored: 2 }]} />)
    expect(screen.getByRole('link', { name: /continue/i })).toBeInTheDocument()
  })

  it('shows scored count when in_progress', () => {
    render(<ManagerStrip summaries={[{ ...BASE, managerScoringStatus: 'in_progress', pillarsScored: 3 }]} />)
    expect(screen.getByText(/3 of 5/i)).toBeInTheDocument()
  })

  it('shows fully scored card (no link) when complete', () => {
    render(<ManagerStrip summaries={[{ ...BASE, managerScoringStatus: 'complete', pillarsScored: 5 }]} />)
    expect(screen.getByText(/fully scored/i)).toBeInTheDocument()
    expect(screen.queryByRole('link')).toBeNull()
  })

  it('shows "N of M assessed" subtext', () => {
    const summaries = [
      { ...BASE, managerScoringStatus: 'complete' as const, pillarsScored: 5 },
      { ...BASE, userId: 'dr-2', name: 'Bob', roundId: 'round-2', managerScoringStatus: 'not_started' as const, pillarsScored: 0 },
    ]
    render(<ManagerStrip summaries={summaries} />)
    expect(screen.getByText(/1 of 2/i)).toBeInTheDocument()
  })

  it('omits DRs with no round from card grid', () => {
    const summaries = [
      BASE,
      { ...BASE, userId: 'dr-2', name: 'Charlie', roundId: null },
    ]
    render(<ManagerStrip summaries={summaries} />)
    expect(screen.getByText('Alice Smith')).toBeInTheDocument()
    expect(screen.queryByText('Charlie')).toBeNull()
  })
})
```

- [ ] **Step 2: Run to verify tests fail**

```bash
npm test -- __tests__/components/dashboard/ManagerStrip.test.tsx
```

Expected: multiple failures — new text patterns not yet present.

- [ ] **Step 3: Replace ManagerStrip component**

Replace the entire content of `components/dashboard/ManagerStrip.tsx`:

```tsx
import Link from 'next/link'
import type { DirectReportRoundSummary } from '@/lib/db/direct-reports'
import type { ManagerScoringStatus } from '@/lib/db/manager-scores'

export type EnrichedDRSummary = DirectReportRoundSummary & {
  userId: string
  name: string
}

interface Props {
  summaries: EnrichedDRSummary[]
}

const STATE_COLORS: Record<ManagerScoringStatus, { border: string; bar: string; text: string }> = {
  not_started: {
    border: 'border-amber-600/50',
    bar: 'bg-amber-500',
    text: 'text-amber-400',
  },
  in_progress: {
    border: 'border-blue-600/50',
    bar: 'bg-blue-500',
    text: 'text-blue-400',
  },
  complete: {
    border: 'border-green-800/40',
    bar: 'bg-green-600',
    text: 'text-green-500',
  },
}

function DrCard({ s }: { s: EnrichedDRSummary }) {
  const { border, bar, text } = STATE_COLORS[s.managerScoringStatus]
  const pct = s.managerScoringStatus === 'complete' ? 100 : (s.pillarsScored / 5) * 100
  const href = `/manager/${s.userId}?roundId=${s.roundId}`

  const statusText =
    s.managerScoringStatus === 'complete'
      ? '✓ Fully scored'
      : s.managerScoringStatus === 'in_progress'
      ? `${s.pillarsScored} of 5 pillars`
      : 'Not scored'

  const actionText =
    s.managerScoringStatus === 'in_progress' ? 'Continue →' : 'Start →'

  const inner = (
    <div
      className={`rounded-lg border bg-slate-900/60 p-3 flex flex-col gap-2 ${border} ${s.managerScoringStatus === 'complete' ? 'opacity-60' : ''}`}
    >
      <p className="text-sm font-medium text-white truncate">{s.name}</p>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
        <div
          className={`h-full rounded-full transition-all ${bar}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className={`text-xs ${text}`}>
        {statusText}
        {s.managerScoringStatus !== 'complete' && (
          <span className="ml-1.5 opacity-70">{actionText}</span>
        )}
      </p>
    </div>
  )

  if (s.managerScoringStatus === 'complete') return <div>{inner}</div>
  return <Link href={href} className="block hover:opacity-90 transition-opacity">{inner}</Link>
}

export function ManagerStrip({ summaries }: Props) {
  const scoreable = summaries.filter(s => s.roundId !== null)
  if (scoreable.length === 0) return null

  const assessedCount = scoreable.filter(s => s.managerScoringStatus === 'complete').length

  return (
    <section id="manager-strip" className="mb-6 rounded-xl border border-amber-800/35 bg-amber-950/10 p-4">
      <div className="mb-3 flex items-center justify-between gap-4">
        <p className="text-xs font-bold uppercase tracking-widest text-amber-400/80">
          Team scoring
        </p>
        <p className="text-xs text-slate-500">
          {assessedCount} of {scoreable.length} assessed
        </p>
      </div>
      <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}>
        {scoreable.map(s => (
          <DrCard key={s.userId} s={s} />
        ))}
      </div>
    </section>
  )
}
```

- [ ] **Step 4: Run tests**

```bash
npm test -- __tests__/components/dashboard/ManagerStrip.test.tsx
```

Expected: all tests pass.

- [ ] **Step 5: Run full suite**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add components/dashboard/ManagerStrip.tsx __tests__/components/dashboard/ManagerStrip.test.tsx
git commit -m "feat: redesign ManagerStrip with card grid, progress bars, and state colors"
```

---

### Task 6: Dashboard manager first-access empty state

**Files:**
- Modify: `app/(app)/dashboard/page.tsx`

When a manager has zero own complete rounds but has scoreable DRs (`enrichedDRs` with `roundId !== null`), the dashboard should render:
1. `ManagerStrip` prominently (full width, existing component — already the first thing rendered in empty state)
2. Muted own-scorecard CTA — no big "one short reflection away from real clarity" headline, no benefit strips. Replace with a quieter "When you're ready, run your own self-assessment too." copy + plain link.

The condition: `allRoundsWithScores.length === 0 && enrichedDRs.some(s => s.roundId !== null)`

Currently the empty state renders the same content regardless of manager status. We need to branch on this condition.

The existing non-manager empty state (no own rounds, no scoreable DRs) remains UNCHANGED.

- [ ] **Step 1: Identify the branch point**

In `app/(app)/dashboard/page.tsx`, the early return for the empty state is at approximately line 93:
```ts
if (allRoundsWithScores.length === 0) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      ...
    </div>
  )
}
```

- [ ] **Step 2: Add the manager first-access check inside the empty-state branch**

Within the `if (allRoundsWithScores.length === 0)` block, check whether the manager has scoreable DRs. If so, render the manager-first layout. If not (or if not a manager), render the existing layout.

Replace the current `if (allRoundsWithScores.length === 0)` return with:

```tsx
  if (allRoundsWithScores.length === 0) {
    const hasScoreableDRs = enrichedDRs.some(s => s.roundId !== null)

    if (hasScoreableDRs) {
      // Manager first-access: team needs scoring, user hasn't done own round yet
      return (
        <div style={{ padding: '40px 36px 0' }}>
          <DashboardManagerTour hasManagerStrip={enrichedDRs.length > 0} />
          <ManagerStrip summaries={enrichedDRs} />

          <div
            style={{
              marginTop: 32,
              padding: '20px 24px',
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 12,
            }}
          >
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginBottom: 12 }}>
              When you're ready, run your own self-assessment too.
            </p>
            <Link
              id="dashboard-cta-btn"
              href="/scorecard"
              style={{
                fontSize: 13,
                color: '#f59e0b',
                textDecoration: 'none',
                fontWeight: 600,
              }}
            >
              Start your scorecard →
            </Link>
          </div>
        </div>
      )
    }

    // Non-manager or manager with no scoreable DRs: existing empty state unchanged
    return (
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {/* CTA area */}
        <div style={{ padding: '40px 36px 0' }}>
          <ManagerStrip summaries={enrichedDRs} />
          {!isManager && <DashboardTour />}
          {isManager && <DashboardManagerTour hasManagerStrip={enrichedDRs.length > 0} />}
          // ... rest of existing empty state unchanged
```

The key change is: extract the "manager with scoreable DRs + no own rounds" case as a separate early return, leaving the existing empty state logic intact for all other cases.

Implement the full replacement of the empty-state block. Preserve all existing code exactly — only add the `hasScoreableDRs` branch before the existing `return`:

```tsx
  if (allRoundsWithScores.length === 0) {
    const hasScoreableDRs = enrichedDRs.some(s => s.roundId !== null)

    if (hasScoreableDRs) {
      return (
        <div style={{ padding: '40px 36px 40px' }}>
          <DashboardManagerTour hasManagerStrip={enrichedDRs.length > 0} />
          <ManagerStrip summaries={enrichedDRs} />
          <div
            style={{
              marginTop: 32,
              padding: '20px 24px',
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 12,
            }}
          >
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginBottom: 12 }}>
              When you&apos;re ready, run your own self-assessment too.
            </p>
            <Link
              id="dashboard-cta-btn"
              href="/scorecard"
              style={{ fontSize: 13, color: '#f59e0b', textDecoration: 'none', fontWeight: 600 }}
            >
              Start your scorecard →
            </Link>
          </div>
        </div>
      )
    }

    return (
      // --- existing empty state JSX unchanged (copy it verbatim) ---
    )
  }
```

- [ ] **Step 3: Run the full test suite**

```bash
npm test
```

Expected: all tests pass. (No dashboard page tests exist currently — this change is verified by build.)

- [ ] **Step 4: Run the build**

```bash
npm run build
```

Expected: clean build.

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/dashboard/page.tsx"
git commit -m "feat: add manager first-access empty state to dashboard"
```

---

### PR 2 wrap-up

```bash
npm run lint && npm run build
```

Fix any errors. Raise PR targeting `master`.

---

## PR 4 — Team Reflections: All Rounds Per DR

Create a new feature branch (do NOT build on PR 1 or PR 2 branches):

```bash
git checkout master && git pull
git checkout -b feat/manager-experience-pr4
```

---

### Task 7: Extend getTeamReflectionSummaries to return all rounds per DR

**Files:**
- Modify: `lib/db/direct-reports.ts`
- Modify: `__tests__/lib/db/direct-reports-team.test.ts`

Currently `getTeamReflectionSummaries` returns one entry per DR (latest round). The team reflections section needs all rounds per DR so managers can see full history.

New types to export from `lib/db/direct-reports.ts`:

```ts
export interface TeamRoundSummary {
  roundId: string
  roundLabel: string
  roundStatus: 'in_progress' | 'complete' | 'scheduled'
  selfScore: number | null    // null unless roundStatus === 'complete'
  managerScore: number | null // null unless manager has fully scored this round
  managerScoringStatus: ManagerScoringStatus
  pillarsScored: number
  completedAt: string | null
}

export interface TeamMemberSummary {
  directReportId: string
  rounds: TeamRoundSummary[]   // all rounds, newest first
  pendingScoringCount: number  // rounds where managerScoringStatus !== 'complete' AND roundId !== null
}
```

The old `TeamReflectionSummary` interface is removed. `getTeamReflectionSummaries` changes return type from `TeamReflectionSummary[]` to `TeamMemberSummary[]`.

Implementation strategy — batch all queries upfront to avoid N+1:
1. Query all rounds for all DR IDs (ordered by created_at DESC)
2. Query all self-scores for the complete rounds (batch by round_id)
3. Query all manager scores for all round IDs for this manager (batch by round_id)
4. Compute per-round summaries in memory

`roundLabel` uses `round.title ?? \`Q${quarter} ${year}\`` — reuse `roundLabel` from `lib/reflections.ts` if `round.title` is available. Since the `assessment_rounds` rows may have a `title` column, include `title` in the select.

- [ ] **Step 1: Update the tests**

Replace `__tests__/lib/db/direct-reports-team.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockAdminFrom = vi.hoisted(() => vi.fn())

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}))
vi.mock('@/lib/skills', () => ({
  PILLARS: ['self', 'team'],
  getSkillsByPillar: (p: string) =>
    p === 'self' ? [{ key: 'sk1' }] : [{ key: 'sk2' }],
  LEVEL_VALUES: { Developing: 1, Approaching: 2, Meeting: 3, Exceeding: 4, Leading: 5 },
}))

beforeEach(() => vi.clearAllMocks())

import { getTeamReflectionSummaries } from '@/lib/db/direct-reports'

// Helper to build a mock Supabase chain returning { data, error }
function mockChain(data: unknown[], error: null | Error = null) {
  const terminal = vi.fn().mockResolvedValue({ data, error })
  return {
    select: vi.fn().mockReturnValue({
      in: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue(terminal),
        eq: vi.fn().mockReturnValue(terminal),
      }),
      eq: vi.fn().mockReturnValue({
        in: vi.fn().mockReturnValue(terminal),
      }),
    }),
  }
}

describe('getTeamReflectionSummaries', () => {
  it('returns empty array when no direct report IDs provided', async () => {
    expect(await getTeamReflectionSummaries([], 'mgr-1')).toEqual([])
  })

  it('returns empty array when no rounds found', async () => {
    mockAdminFrom.mockReturnValue(mockChain([]))
    expect(await getTeamReflectionSummaries(['dr-1'], 'mgr-1')).toEqual([])
  })

  it('groups rounds by DR and returns TeamMemberSummary', async () => {
    const rounds = [
      { id: 'r1', user_id: 'dr-1', status: 'complete', title: null, created_at: '2026-05-20T00:00:00Z', completed_at: '2026-05-20T12:00:00Z' },
      { id: 'r2', user_id: 'dr-1', status: 'in_progress', title: null, created_at: '2026-05-22T00:00:00Z', completed_at: null },
    ]
    // First call: rounds query. Second: self scores. Third: manager scores.
    mockAdminFrom
      .mockReturnValueOnce(mockChain(rounds))         // assessment_rounds
      .mockReturnValueOnce(mockChain([]))              // scores (no self scores yet for in_progress)
      .mockReturnValueOnce(mockChain([]))              // manager_scores

    const result = await getTeamReflectionSummaries(['dr-1'], 'mgr-1')
    expect(result).toHaveLength(1)
    expect(result[0].directReportId).toBe('dr-1')
    expect(result[0].rounds).toHaveLength(2)
  })

  it('computes selfScore as average level value for complete rounds', async () => {
    const rounds = [
      { id: 'r1', user_id: 'dr-1', status: 'complete', title: null, created_at: '2026-05-20T00:00:00Z', completed_at: '2026-05-20T12:00:00Z' },
    ]
    const scores = [
      { round_id: 'r1', level: 'Approaching' },
      { round_id: 'r1', level: 'Meeting' },
    ]
    mockAdminFrom
      .mockReturnValueOnce(mockChain(rounds))
      .mockReturnValueOnce(mockChain(scores))
      .mockReturnValueOnce(mockChain([]))

    const result = await getTeamReflectionSummaries(['dr-1'], 'mgr-1')
    // Approaching=2, Meeting=3, avg=2.5
    expect(result[0].rounds[0].selfScore).toBe(2.5)
  })

  it('sets selfScore to null for non-complete rounds', async () => {
    const rounds = [
      { id: 'r1', user_id: 'dr-1', status: 'in_progress', title: null, created_at: '2026-05-22T00:00:00Z', completed_at: null },
    ]
    mockAdminFrom
      .mockReturnValueOnce(mockChain(rounds))
      .mockReturnValueOnce(mockChain([]))  // no self scores queried for non-complete
      .mockReturnValueOnce(mockChain([]))

    const result = await getTeamReflectionSummaries(['dr-1'], 'mgr-1')
    expect(result[0].rounds[0].selfScore).toBeNull()
  })

  it('computes managerScoringStatus from manager_scores', async () => {
    const rounds = [
      { id: 'r1', user_id: 'dr-1', status: 'complete', title: null, created_at: '2026-05-20T00:00:00Z', completed_at: '2026-05-20T12:00:00Z' },
    ]
    // Manager has scored sk1 but not sk2 → in_progress
    const mgrScores = [{ round_id: 'r1', skill_key: 'sk1', level: 'Meeting' }]
    mockAdminFrom
      .mockReturnValueOnce(mockChain(rounds))
      .mockReturnValueOnce(mockChain([]))
      .mockReturnValueOnce(mockChain(mgrScores))

    const result = await getTeamReflectionSummaries(['dr-1'], 'mgr-1')
    expect(result[0].rounds[0].managerScoringStatus).toBe('in_progress')
    expect(result[0].rounds[0].pillarsScored).toBe(1)
  })

  it('sets pendingScoringCount correctly', async () => {
    const rounds = [
      { id: 'r1', user_id: 'dr-1', status: 'complete', title: null, created_at: '2026-05-20T00:00:00Z', completed_at: '2026-05-20T12:00:00Z' },
      { id: 'r2', user_id: 'dr-1', status: 'complete', title: null, created_at: '2026-04-01T00:00:00Z', completed_at: '2026-04-01T12:00:00Z' },
    ]
    // Manager fully scored r2 (both sk1 and sk2), not r1
    const mgrScores = [
      { round_id: 'r2', skill_key: 'sk1', level: 'Meeting' },
      { round_id: 'r2', skill_key: 'sk2', level: 'Meeting' },
    ]
    mockAdminFrom
      .mockReturnValueOnce(mockChain(rounds))
      .mockReturnValueOnce(mockChain([]))
      .mockReturnValueOnce(mockChain(mgrScores))

    const result = await getTeamReflectionSummaries(['dr-1'], 'mgr-1')
    // r1 is not_started → pending. r2 is complete → not pending.
    expect(result[0].pendingScoringCount).toBe(1)
  })

  it('sorts DRs with pending scoring before fully scored DRs', async () => {
    const rounds = [
      { id: 'r1', user_id: 'dr-1', status: 'complete', title: null, created_at: '2026-05-20T00:00:00Z', completed_at: '2026-05-20T12:00:00Z' },
      { id: 'r2', user_id: 'dr-2', status: 'complete', title: null, created_at: '2026-05-21T00:00:00Z', completed_at: '2026-05-21T12:00:00Z' },
    ]
    // Manager fully scored dr-1, not dr-2
    const mgrScores = [
      { round_id: 'r1', skill_key: 'sk1', level: 'Meeting' },
      { round_id: 'r1', skill_key: 'sk2', level: 'Meeting' },
    ]
    mockAdminFrom
      .mockReturnValueOnce(mockChain(rounds))
      .mockReturnValueOnce(mockChain([]))
      .mockReturnValueOnce(mockChain(mgrScores))

    const result = await getTeamReflectionSummaries(['dr-1', 'dr-2'], 'mgr-1')
    expect(result[0].directReportId).toBe('dr-2') // pending scoring first
    expect(result[1].directReportId).toBe('dr-1') // fully scored last
  })
})
```

- [ ] **Step 2: Run to verify tests fail**

```bash
npm test -- __tests__/lib/db/direct-reports-team.test.ts
```

Expected: most tests fail (new type shape not yet returned).

- [ ] **Step 3: Implement the new getTeamReflectionSummaries**

In `lib/db/direct-reports.ts`, replace the `TeamReflectionSummary` interface and `getTeamReflectionSummaries` function:

Remove (or replace) these interfaces:
```ts
export interface TeamReflectionSummary { ... }
```

Add new interfaces:
```ts
export interface TeamRoundSummary {
  roundId: string
  roundLabel: string
  roundStatus: 'in_progress' | 'complete' | 'scheduled'
  selfScore: number | null
  managerScore: number | null
  managerScoringStatus: ManagerScoringStatus
  pillarsScored: number
  completedAt: string | null
}

export interface TeamMemberSummary {
  directReportId: string
  rounds: TeamRoundSummary[]
  pendingScoringCount: number
}
```

Replace `getTeamReflectionSummaries` with:

```ts
export async function getTeamReflectionSummaries(
  directReportIds: string[],
  managerId: string
): Promise<TeamMemberSummary[]> {
  if (directReportIds.length === 0) return []

  const admin = createAdminClient()

  // 1. All rounds for all DRs, newest first
  const { data: rounds } = await admin
    .from('assessment_rounds')
    .select('id, user_id, status, title, created_at, completed_at')
    .in('user_id', directReportIds)
    .order('created_at', { ascending: false })

  if (!rounds?.length) return []

  const allRoundIds = (rounds as { id: string }[]).map(r => r.id)
  const completedRoundIds = (rounds as { id: string; status: string }[])
    .filter(r => r.status === 'complete')
    .map(r => r.id)

  // 2. Self-scores for complete rounds only (batch)
  const { data: selfScoreRows } = completedRoundIds.length > 0
    ? await admin
        .from('scores')
        .select('round_id, level')
        .in('round_id', completedRoundIds)
    : { data: [] }

  // 3. Manager scores for all rounds (batch)
  const { data: mgrScoreRows } = await admin
    .from('manager_scores')
    .select('round_id, skill_key, level')
    .eq('manager_id', managerId)
    .in('round_id', allRoundIds)

  // Group self-scores by round_id
  const selfScoresByRound = new Map<string, { level: string }[]>()
  for (const row of (selfScoreRows ?? []) as { round_id: string; level: string }[]) {
    const bucket = selfScoresByRound.get(row.round_id) ?? []
    bucket.push(row)
    selfScoresByRound.set(row.round_id, bucket)
  }

  // Group manager scores by round_id
  const mgrScoresByRound = new Map<string, { skill_key: string; level: string }[]>()
  for (const row of (mgrScoreRows ?? []) as { round_id: string; skill_key: string; level: string }[]) {
    const bucket = mgrScoresByRound.get(row.round_id) ?? []
    bucket.push(row)
    mgrScoresByRound.set(row.round_id, bucket)
  }

  const allSkillKeys = PILLARS.flatMap(p => getSkillsByPillar(p).map(s => s.key))

  function computeRoundSummary(round: {
    id: string
    user_id: string
    status: string
    title: string | null
    created_at: string
    completed_at: string | null
  }): TeamRoundSummary {
    const status = round.status as TeamRoundSummary['roundStatus']

    // Self score: average level value, only for complete rounds
    let selfScore: number | null = null
    if (status === 'complete') {
      const sScores = selfScoresByRound.get(round.id) ?? []
      if (sScores.length > 0) {
        const avg = sScores.reduce((sum, s) => sum + LEVEL_VALUES[s.level as Level], 0) / sScores.length
        selfScore = Number(avg.toFixed(1))
      }
    }

    // Manager scoring status + pillars scored
    const mScores = mgrScoresByRound.get(round.id) ?? []
    const scoredKeys = new Set(mScores.map(s => s.skill_key))
    let managerScoringStatus: ManagerScoringStatus
    if (scoredKeys.size === 0) {
      managerScoringStatus = 'not_started'
    } else if (allSkillKeys.every(k => scoredKeys.has(k))) {
      managerScoringStatus = 'complete'
    } else {
      managerScoringStatus = 'in_progress'
    }

    const scoredPillarSet = new Set(
      [...scoredKeys]
        .map(key => PILLARS.find(p => getSkillsByPillar(p).some(s => s.key === key)))
        .filter((p): p is Pillar => p !== undefined)
    )

    // Manager score average — only if fully scored
    let managerScore: number | null = null
    if (managerScoringStatus === 'complete' && mScores.length > 0) {
      const avg = mScores.reduce((sum, s) => sum + LEVEL_VALUES[s.level as Level], 0) / mScores.length
      managerScore = Number(avg.toFixed(1))
    }

    // Round label: title or Q{n} YYYY
    const d = new Date(round.created_at)
    const quarter = Math.floor(d.getMonth() / 3) + 1
    const roundLabel = round.title ?? `Q${quarter} ${d.getFullYear()}`

    return {
      roundId: round.id,
      roundLabel,
      roundStatus: status,
      selfScore,
      managerScore,
      managerScoringStatus,
      pillarsScored: scoredPillarSet.size,
      completedAt: round.completed_at,
    }
  }

  // Group rounds by DR
  const roundsByDR = new Map<string, typeof rounds>()
  for (const round of rounds as typeof rounds) {
    const bucket = roundsByDR.get(round.user_id) ?? []
    bucket.push(round)
    roundsByDR.set(round.user_id, bucket)
  }

  const summaries: TeamMemberSummary[] = Array.from(roundsByDR.entries()).map(([drId, drRounds]) => {
    const roundSummaries = drRounds.map(r => computeRoundSummary(r))
    const pendingScoringCount = roundSummaries.filter(r => r.managerScoringStatus !== 'complete').length
    return { directReportId: drId, rounds: roundSummaries, pendingScoringCount }
  })

  // DRs with pending scoring first, then alphabetically (by insertion order since we don't have names here)
  return summaries.sort((a, b) => {
    const pendingA = a.pendingScoringCount > 0 ? 0 : 1
    const pendingB = b.pendingScoringCount > 0 ? 0 : 1
    return pendingA - pendingB
  })
}
```

Add the `Pillar` import at the top of the file if not already present:
```ts
import type { Level, Pillar } from '@/lib/skills'
```

- [ ] **Step 4: Run the team tests**

```bash
npm test -- __tests__/lib/db/direct-reports-team.test.ts
```

Expected: all tests pass.

- [ ] **Step 5: Run full suite**

```bash
npm test
```

Expected: one or more failures in `TeamReflectionsSection.test.tsx` and `reflections/page.tsx` tests (if any exist) because the type shape changed. These are fixed in Task 8.

- [ ] **Step 6: Commit**

```bash
git add lib/db/direct-reports.ts __tests__/lib/db/direct-reports-team.test.ts
git commit -m "feat: extend getTeamReflectionSummaries to return all rounds per DR"
```

---

### Task 8: TeamReflectionsSection redesign + update reflections page

**Files:**
- Modify: `components/reflections/TeamReflectionsSection.tsx`
- Modify: `__tests__/components/reflections/TeamReflectionsSection.test.tsx`
- Modify: `app/(app)/reflections/page.tsx`

The component changes from one-row-per-DR (using `TeamReflectionSummary`) to a per-DR card with per-round table rows (using `TeamMemberSummary` and `TeamRoundSummary` from Task 7).

The reflections page enriches summaries with `displayName`. The enriched shape is:
```ts
type EnrichedTeamMember = TeamMemberSummary & { name: string }
```

- [ ] **Step 1: Update the component tests**

Replace `__tests__/components/reflections/TeamReflectionsSection.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { TeamReflectionsSection } from '@/components/reflections/TeamReflectionsSection'
import type { TeamMemberSummary } from '@/lib/db/direct-reports'

type EnrichedMember = TeamMemberSummary & { name: string }

const COMPLETE_ROUND = {
  roundId: 'r1',
  roundLabel: 'Q1 2026',
  roundStatus: 'complete' as const,
  selfScore: 3.2,
  managerScore: 3.8,
  managerScoringStatus: 'complete' as const,
  pillarsScored: 5,
  completedAt: '2026-03-15T12:00:00Z',
}

const PENDING_ROUND = {
  roundId: 'r2',
  roundLabel: 'Q2 2026',
  roundStatus: 'complete' as const,
  selfScore: 3.5,
  managerScore: null,
  managerScoringStatus: 'not_started' as const,
  pillarsScored: 0,
  completedAt: '2026-06-01T12:00:00Z',
}

const IN_PROGRESS_ROUND = {
  roundId: 'r3',
  roundLabel: 'Q3 2026',
  roundStatus: 'in_progress' as const,
  selfScore: null,
  managerScore: null,
  managerScoringStatus: 'in_progress' as const,
  pillarsScored: 2,
  completedAt: null,
}

const ALICE: EnrichedMember = {
  directReportId: 'dr-1',
  name: 'Alice',
  rounds: [PENDING_ROUND, COMPLETE_ROUND],
  pendingScoringCount: 1,
}

describe('TeamReflectionsSection', () => {
  it('renders null when summaries is empty', () => {
    const { container } = render(<TeamReflectionsSection summaries={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders DR name', () => {
    render(<TeamReflectionsSection summaries={[ALICE]} />)
    expect(screen.getByText('Alice')).toBeInTheDocument()
  })

  it('renders round label for each round', () => {
    render(<TeamReflectionsSection summaries={[ALICE]} />)
    expect(screen.getByText('Q2 2026')).toBeInTheDocument()
    expect(screen.getByText('Q1 2026')).toBeInTheDocument()
  })

  it('shows self score for complete rounds', () => {
    render(<TeamReflectionsSection summaries={[ALICE]} />)
    expect(screen.getByText('3.2')).toBeInTheDocument()
  })

  it('shows — for self score on non-complete rounds', () => {
    const member: EnrichedMember = { ...ALICE, rounds: [IN_PROGRESS_ROUND], pendingScoringCount: 1 }
    render(<TeamReflectionsSection summaries={[member]} />)
    // self score column shows —
    expect(screen.getAllByText('—').length).toBeGreaterThan(0)
  })

  it('shows "Score →" link for not_started manager scoring', () => {
    render(<TeamReflectionsSection summaries={[ALICE]} />)
    const scoreLinks = screen.getAllByRole('link', { name: /score/i })
    expect(scoreLinks.length).toBeGreaterThan(0)
    expect(scoreLinks[0]).toHaveAttribute('href', expect.stringContaining('/manager/dr-1?roundId=r2'))
  })

  it('shows "N/5 pillars" for in_progress manager scoring', () => {
    const member: EnrichedMember = {
      ...ALICE,
      rounds: [{ ...IN_PROGRESS_ROUND, managerScoringStatus: 'in_progress', pillarsScored: 2 }],
      pendingScoringCount: 1,
    }
    render(<TeamReflectionsSection summaries={[member]} />)
    expect(screen.getByText(/2\/5/)).toBeInTheDocument()
  })

  it('shows manager score when complete', () => {
    render(<TeamReflectionsSection summaries={[ALICE]} />)
    expect(screen.getByText('3.8')).toBeInTheDocument()
  })

  it('shows pending badge count in card header', () => {
    render(<TeamReflectionsSection summaries={[ALICE]} />)
    expect(screen.getByText(/1.*scoring/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run to verify tests fail**

```bash
npm test -- __tests__/components/reflections/TeamReflectionsSection.test.tsx
```

Expected: failures — component doesn't render per-round rows yet.

- [ ] **Step 3: Replace TeamReflectionsSection component**

Replace the entire content of `components/reflections/TeamReflectionsSection.tsx`:

```tsx
import Link from 'next/link'
import type { TeamMemberSummary, TeamRoundSummary } from '@/lib/db/direct-reports'
import type { ManagerScoringStatus } from '@/lib/db/manager-scores'

type EnrichedMember = TeamMemberSummary & { name: string }

const STATUS_PILL: Record<string, { label: string; className: string }> = {
  scheduled: { label: 'Scheduled', className: 'bg-slate-700 text-slate-300' },
  in_progress: { label: 'In progress', className: 'bg-green-900/50 text-green-400' },
  complete: { label: 'Complete', className: 'bg-slate-800 text-slate-400' },
}

function ManagerScoreCell({
  round,
  drId,
}: {
  round: TeamRoundSummary
  drId: string
}) {
  const { managerScoringStatus, managerScore, pillarsScored, roundId } = round

  if (managerScoringStatus === 'complete' && managerScore !== null) {
    return <span className="text-xs text-purple-400">{managerScore} ✓</span>
  }
  if (managerScoringStatus === 'in_progress') {
    return (
      <Link
        href={`/manager/${drId}?roundId=${roundId}`}
        className="text-xs text-blue-400 hover:text-blue-300"
      >
        {pillarsScored}/5 · Continue →
      </Link>
    )
  }
  return (
    <Link
      href={`/manager/${drId}?roundId=${roundId}`}
      className="text-xs font-medium text-amber-400 hover:text-amber-300"
    >
      Score →
    </Link>
  )
}

function DrCard({ member }: { member: EnrichedMember }) {
  const { directReportId, name, rounds, pendingScoringCount } = member

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 overflow-hidden">
      {/* Card header */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-neutral-800">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-semibold text-white flex-shrink-0">
            {name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-medium text-white">{name}</p>
            <p className="text-xs text-neutral-500">{rounds.length} round{rounds.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        {pendingScoringCount > 0 ? (
          <span className="rounded-full bg-amber-900/50 px-2 py-0.5 text-xs font-medium text-amber-400">
            {pendingScoringCount} needs scoring
          </span>
        ) : (
          <span className="rounded-full bg-green-900/30 px-2 py-0.5 text-xs text-green-500">
            ✓ All scored
          </span>
        )}
      </div>

      {/* Round rows */}
      {rounds.length === 0 ? (
        <p className="px-4 py-3 text-xs text-neutral-500">No rounds started yet.</p>
      ) : (
        <div className="divide-y divide-neutral-800/50">
          {rounds.map(round => {
            const pill = STATUS_PILL[round.roundStatus] ?? STATUS_PILL.complete
            return (
              <div key={round.roundId} className="grid items-center gap-3 px-4 py-2.5 text-xs"
                style={{ gridTemplateColumns: '1fr auto auto auto' }}>
                <span className="text-neutral-300 truncate">{round.roundLabel}</span>
                <span className={`rounded px-1.5 py-0.5 font-medium ${pill.className}`}>{pill.label}</span>
                <span className="text-neutral-400 w-8 text-right">
                  {round.roundStatus === 'complete' && round.selfScore !== null
                    ? round.selfScore
                    : '—'}
                </span>
                <ManagerScoreCell round={round} drId={directReportId} />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function TeamReflectionsSection({ summaries }: { summaries: EnrichedMember[] }) {
  if (summaries.length === 0) return null

  return (
    <section>
      <div className="mb-4 flex items-center gap-3">
        <div className="h-px flex-1 bg-neutral-800" />
        <p className="text-xs font-bold uppercase tracking-widest text-purple-400/70">
          Your team&apos;s reflections
        </p>
        <div className="h-px flex-1 bg-neutral-800" />
      </div>
      <div className="flex flex-col gap-4">
        {summaries.map(member => (
          <DrCard key={member.directReportId} member={member} />
        ))}
      </div>
    </section>
  )
}
```

- [ ] **Step 4: Update the reflections page to use the new type**

In `app/(app)/reflections/page.tsx`, the import for `TeamReflectionSummary` no longer exists. Update:

```ts
// Old:
import { getTeamReflectionSummaries, type TeamReflectionSummary } from '@/lib/db/direct-reports'

// New:
import { getTeamReflectionSummaries, type TeamMemberSummary } from '@/lib/db/direct-reports'
```

Update the type annotation for the empty fallback:
```ts
// Old:
: [[] as TeamReflectionSummary[], []]

// New:
: [[] as TeamMemberSummary[], []]
```

The `enrichedTeamSummaries` mapping stays the same (spreading `...s` and adding `name`). TypeScript will infer the correct type.

- [ ] **Step 5: Run the component tests**

```bash
npm test -- __tests__/components/reflections/TeamReflectionsSection.test.tsx
```

Expected: all tests pass.

- [ ] **Step 6: Run the full suite**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 7: Run build**

```bash
npm run build
```

Expected: clean build. Fix any TypeScript errors.

- [ ] **Step 8: Commit**

```bash
git add components/reflections/TeamReflectionsSection.tsx \
        __tests__/components/reflections/TeamReflectionsSection.test.tsx \
        "app/(app)/reflections/page.tsx"
git commit -m "feat: redesign TeamReflectionsSection with per-round rows and manager score column"
```

---

### PR 4 wrap-up

```bash
npm run lint && npm run build
```

Fix any errors. Raise PR targeting `master`.

---

## Self-Review

**Spec coverage check:**

| Spec section | Plan task |
|---|---|
| PR 1: email for connection_request_received | Task 2 + Task 3 |
| PR 1: email for connection_accepted | Task 2 + Task 3 |
| PR 1: email for round_scheduled | Task 2 + Task 3 |
| PR 1: NotificationsList icons + descriptions + unread styling | Task 4 |
| PR 2: ManagerStrip card grid + progress bars + state colors | Task 5 |
| PR 2: Manager first-access empty state | Task 6 |
| PR 4: getTeamReflectionSummaries — all rounds per DR | Task 7 |
| PR 4: TeamReflectionsSection per-round rows | Task 8 |
| PR 4: Score reveal guard | Already shipped |
| PR 3: Informed/blind scoring | Already shipped |
| DB migration, in-app notifications, sidebar badge | Already shipped |

**Placeholder scan:** No TBD, TODO, or vague steps — all tasks contain complete code.

**Type consistency:**
- `TeamMemberSummary` / `TeamRoundSummary` defined in Task 7, used in Task 8 ✓
- `EnrichedMember = TeamMemberSummary & { name: string }` defined locally in the component (no export needed) ✓
- `ManagerScoringStatus` imported from `lib/db/manager-scores` in Task 7 and Task 8 ✓
- `sendConnectionRequestEmail(recipientId: string, fromName: string)` defined in Task 2, called in Task 3 ✓
