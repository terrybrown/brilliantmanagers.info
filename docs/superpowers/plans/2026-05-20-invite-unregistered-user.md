# Invite Unregistered User Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When adding a connection to an email that has no Brilliant Managers account, store a pending invitation and email them to register; auto-activate the connection when they verify their OTP.

**Architecture:** New `pending_invitations` table stores invites by email. The `inviteConnection` server action pivots to this path when `createConnection` returns "no account found". The existing `confirmLogin` action in `/auth/confirm` gains a step that consumes any pending invitations for the newly-registered user's email and creates active `connections` rows using the service-role Supabase client (`lib/supabase/admin.ts`, which already exists).

**Tech Stack:** Next.js 15 App Router · Supabase (PostgreSQL + RLS) · Vitest + Testing Library · Mailgun (via existing `lib/email/mailgun.ts`)

---

## File Map

| Action | Path |
|---|---|
| Create | `supabase/migrations/20260520000000_pending_invitations.sql` |
| Create | `lib/db/pending-invitations.ts` |
| Create | `lib/email/templates/connection-invite.ts` |
| Modify | `app/(app)/connections/actions.ts` |
| Modify | `app/auth/confirm/actions.ts` |
| Create | `__tests__/lib/db/pending-invitations.test.ts` |
| Create | `__tests__/lib/email/connection-invite.test.ts` |
| Modify | `__tests__/app/connections/actions.test.ts` |
| Create | `__tests__/app/auth/confirm/actions.test.ts` |

`lib/supabase/admin.ts` already exports `createAdminClient()` — no change needed.

---

### Task 1: Migration — pending_invitations table

**Files:**
- Create: `supabase/migrations/20260520000000_pending_invitations.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- supabase/migrations/20260520000000_pending_invitations.sql

CREATE TABLE pending_invitations (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_email text        NOT NULL,
  inviter_role  text        NOT NULL CHECK (inviter_role IN ('manager', 'direct_report')),
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE pending_invitations ENABLE ROW LEVEL SECURITY;

-- Inviters can see and create their own rows
CREATE POLICY "inviter_select" ON pending_invitations
  FOR SELECT USING (inviter_id = auth.uid());

CREATE POLICY "inviter_insert" ON pending_invitations
  FOR INSERT WITH CHECK (inviter_id = auth.uid());

-- Deletion is performed via the service role key (bypasses RLS)
-- No DELETE policy needed for authenticated users
```

- [ ] **Step 2: Apply the migration to your Supabase project**

Run in the Supabase SQL editor or via the CLI:
```bash
supabase db push
# or apply manually in the Supabase dashboard SQL editor
```

- [ ] **Step 3: Verify RLS blocks unauthenticated access**

```bash
SUPABASE_URL="https://jxanausntacmzgnzzncu.supabase.co"
ANON_KEY="$NEXT_PUBLIC_SUPABASE_ANON_KEY"

# Should return []  (no data, not an error — SELECT is allowed but returns nothing for anon)
curl -s -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY" \
  "$SUPABASE_URL/rest/v1/pending_invitations?select=*"

# Should return a 42501 RLS violation
curl -s -X POST -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"inviter_id":"00000000-0000-0000-0000-000000000000","invited_email":"x@x.com","inviter_role":"manager"}' \
  "$SUPABASE_URL/rest/v1/pending_invitations"
```

Expected INSERT response contains `"code":"42501"`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260520000000_pending_invitations.sql
git commit -m "feat: add pending_invitations table with RLS"
```

---

### Task 2: createPendingInvitation() function

**Files:**
- Create: `lib/db/pending-invitations.ts`
- Create: `__tests__/lib/db/pending-invitations.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// __tests__/lib/db/pending-invitations.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockInsert = vi.fn()
const mockFrom = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({ from: mockFrom }),
}))

describe('createPendingInvitation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    mockFrom.mockReturnValue({ insert: mockInsert })
    mockInsert.mockResolvedValue({ error: null })
  })

  it('inserts a row into pending_invitations and returns {}', async () => {
    const { createPendingInvitation } = await import('@/lib/db/pending-invitations')
    const result = await createPendingInvitation({
      inviterId: 'user-1',
      invitedEmail: 'new@example.com',
      inviterRole: 'manager',
    })
    expect(result).toEqual({})
    expect(mockFrom).toHaveBeenCalledWith('pending_invitations')
    expect(mockInsert).toHaveBeenCalledWith({
      inviter_id: 'user-1',
      invited_email: 'new@example.com',
      inviter_role: 'manager',
    })
  })

  it('returns { error } when the insert fails', async () => {
    mockInsert.mockResolvedValueOnce({ error: { message: 'DB error' } })
    const { createPendingInvitation } = await import('@/lib/db/pending-invitations')
    const result = await createPendingInvitation({
      inviterId: 'user-1',
      invitedEmail: 'new@example.com',
      inviterRole: 'direct_report',
    })
    expect(result).toEqual({ error: 'DB error' })
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test -- --reporter=verbose __tests__/lib/db/pending-invitations.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/db/pending-invitations'`

- [ ] **Step 3: Implement createPendingInvitation()**

```typescript
// lib/db/pending-invitations.ts
import { createClient } from '@/lib/supabase/server'

export async function createPendingInvitation(params: {
  inviterId: string
  invitedEmail: string
  inviterRole: 'manager' | 'direct_report'
}): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.from('pending_invitations').insert({
    inviter_id: params.inviterId,
    invited_email: params.invitedEmail,
    inviter_role: params.inviterRole,
  })
  if (error) return { error: error.message }
  return {}
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test -- --reporter=verbose __tests__/lib/db/pending-invitations.test.ts
```

Expected: PASS — 2 tests

- [ ] **Step 5: Commit**

```bash
git add lib/db/pending-invitations.ts __tests__/lib/db/pending-invitations.test.ts
git commit -m "feat: add createPendingInvitation() for unregistered user invites"
```

---

### Task 3: connection-invite email template

**Files:**
- Create: `lib/email/templates/connection-invite.ts`
- Create: `__tests__/lib/email/connection-invite.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// __tests__/lib/email/connection-invite.test.ts
import { describe, it, expect, vi, afterEach } from 'vitest'
import { buildConnectionInviteEmail } from '@/lib/email/templates/connection-invite'

afterEach(() => { vi.unstubAllEnvs() })

describe('buildConnectionInviteEmail', () => {
  it('includes the sender name in the subject', () => {
    const { subject } = buildConnectionInviteEmail({
      fromName: 'Alice',
      toEmail: 'bob@example.com',
      inviterRole: 'manager',
    })
    expect(subject).toContain('Alice')
  })

  it('links to /login in the html body', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://app.example.com')
    const { html } = buildConnectionInviteEmail({
      fromName: 'Alice',
      toEmail: 'bob@example.com',
      inviterRole: 'manager',
    })
    expect(html).toContain('https://app.example.com/login')
  })

  it('describes the direct report relationship when inviterRole is manager', () => {
    const { html } = buildConnectionInviteEmail({
      fromName: 'Alice',
      toEmail: 'bob@example.com',
      inviterRole: 'manager',
    })
    expect(html).toContain('direct report')
  })

  it('describes the manager relationship when inviterRole is direct_report', () => {
    const { html } = buildConnectionInviteEmail({
      fromName: 'Alice',
      toEmail: 'bob@example.com',
      inviterRole: 'direct_report',
    })
    expect(html).toContain('manager')
  })

  it('includes the personal message when provided', () => {
    const { html } = buildConnectionInviteEmail({
      fromName: 'Alice',
      toEmail: 'bob@example.com',
      inviterRole: 'manager',
      personalMessage: 'Hi, join my team!',
    })
    expect(html).toContain('Hi, join my team!')
  })

  it('omits the personal-message block when no message is provided', () => {
    const { html } = buildConnectionInviteEmail({
      fromName: 'Alice',
      toEmail: 'bob@example.com',
      inviterRole: 'manager',
    })
    expect(html).not.toContain('personal-message')
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test -- --reporter=verbose __tests__/lib/email/connection-invite.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/email/templates/connection-invite'`

- [ ] **Step 3: Implement the template**

```typescript
// lib/email/templates/connection-invite.ts
interface ConnectionInviteEmailParams {
  fromName: string
  toEmail: string
  inviterRole: 'manager' | 'direct_report'
  personalMessage?: string
}

interface EmailContent {
  subject: string
  html: string
}

export function buildConnectionInviteEmail({
  fromName,
  inviterRole,
  personalMessage,
}: ConnectionInviteEmailParams): EmailContent {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://brilliantmanagers.info'
  const loginUrl = `${appUrl}/login`

  const relationshipText =
    inviterRole === 'manager'
      ? 'invited you as one of their direct reports'
      : 'invited you as their manager'

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
          <strong style="color:#f1f5f9;">${fromName}</strong> has ${relationshipText} on
          Brilliant Managers, a tool for tracking management effectiveness.
        </p>
        ${messageBlock}
        <div style="margin:28px 0;">
          <a href="${loginUrl}"
             style="display:inline-block;padding:12px 24px;background:#4f46e5;color:#fff;
                    font-weight:600;font-size:15px;text-decoration:none;border-radius:8px;">
            Create your account →
          </a>
        </div>
        <p style="margin:0;color:#4b5563;font-size:13px;line-height:1.5;">
          You'll need to create a free account to accept this connection. If you weren't
          expecting this, you can safely ignore it.
        </p>
      </div>
    </div>
  </div>
</body>
</html>`

  return {
    subject: `${fromName} has invited you to join Brilliant Managers`,
    html,
  }
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test -- --reporter=verbose __tests__/lib/email/connection-invite.test.ts
```

Expected: PASS — 6 tests

- [ ] **Step 5: Commit**

```bash
git add lib/email/templates/connection-invite.ts __tests__/lib/email/connection-invite.test.ts
git commit -m "feat: add connection-invite email template for unregistered users"
```

---

### Task 4: Update inviteConnection action

**Files:**
- Modify: `app/(app)/connections/actions.ts`
- Modify: `__tests__/app/connections/actions.test.ts`

- [ ] **Step 1: Update the test file**

Replace the entire contents of `__tests__/app/connections/actions.test.ts` with:

```typescript
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
  acceptConnection: vi.fn().mockResolvedValue({}),
}))

vi.mock('@/lib/db/pending-invitations', () => ({
  createPendingInvitation: vi.fn().mockResolvedValue({}),
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

vi.mock('@/lib/email/templates/connection-invite', () => ({
  buildConnectionInviteEmail: vi.fn().mockReturnValue({ subject: 'S', html: '<p></p>' }),
}))

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

describe('inviteConnection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('returns { success: true } when connection is created for an existing user', async () => {
    const { inviteConnection } = await import('@/app/(app)/connections/actions')
    const fd = new FormData()
    fd.set('email', 'boss@example.com')
    fd.set('role', 'direct_report')
    const result = await inviteConnection({ success: false }, fd)
    expect(result).toEqual({ success: true })
  })

  it('calls sendEmail with the manager-invite template when role is direct_report and user exists', async () => {
    const { sendEmail } = await import('@/lib/email/mailgun')
    const { inviteConnection } = await import('@/app/(app)/connections/actions')
    const fd = new FormData()
    fd.set('email', 'boss@example.com')
    fd.set('role', 'direct_report')
    await inviteConnection({ success: false }, fd)
    expect(sendEmail).toHaveBeenCalledOnce()
  })

  it('does NOT call sendEmail when role is manager and user exists', async () => {
    const { sendEmail } = await import('@/lib/email/mailgun')
    const { inviteConnection } = await import('@/app/(app)/connections/actions')
    const fd = new FormData()
    fd.set('email', 'report@example.com')
    fd.set('role', 'manager')
    await inviteConnection({ success: false }, fd)
    expect(sendEmail).not.toHaveBeenCalled()
  })

  it('creates a pending invitation when no account is found, and returns success', async () => {
    const { createConnection } = await import('@/lib/db/connections')
    vi.mocked(createConnection).mockResolvedValueOnce({
      error: 'No account found for that email. Ask them to sign up first.',
    })
    const { createPendingInvitation } = await import('@/lib/db/pending-invitations')
    const { inviteConnection } = await import('@/app/(app)/connections/actions')
    const fd = new FormData()
    fd.set('email', 'nobody@example.com')
    fd.set('role', 'direct_report')
    const result = await inviteConnection({ success: false }, fd)
    expect(result).toEqual({ success: true })
    expect(vi.mocked(createPendingInvitation)).toHaveBeenCalledWith({
      inviterId: 'user-1',
      invitedEmail: 'nobody@example.com',
      inviterRole: 'direct_report',
    })
  })

  it('sends the connection-invite email when no account is found', async () => {
    const { createConnection } = await import('@/lib/db/connections')
    vi.mocked(createConnection).mockResolvedValueOnce({
      error: 'No account found for that email. Ask them to sign up first.',
    })
    const { sendEmail } = await import('@/lib/email/mailgun')
    const { buildConnectionInviteEmail } = await import('@/lib/email/templates/connection-invite')
    const { inviteConnection } = await import('@/app/(app)/connections/actions')
    const fd = new FormData()
    fd.set('email', 'nobody@example.com')
    fd.set('role', 'manager')
    await inviteConnection({ success: false }, fd)
    expect(vi.mocked(buildConnectionInviteEmail)).toHaveBeenCalledWith(
      expect.objectContaining({ inviterRole: 'manager', toEmail: 'nobody@example.com' })
    )
    expect(sendEmail).toHaveBeenCalledOnce()
  })

  it('returns { success: false, error } for non-account errors from createConnection', async () => {
    const { createConnection } = await import('@/lib/db/connections')
    vi.mocked(createConnection).mockResolvedValueOnce({ error: 'Connection already exists.' })
    const { inviteConnection } = await import('@/app/(app)/connections/actions')
    const fd = new FormData()
    fd.set('email', 'existing@example.com')
    fd.set('role', 'direct_report')
    const result = await inviteConnection({ success: false }, fd)
    expect(result.success).toBe(false)
    expect(result.error).toBe('Connection already exists.')
  })

  it('returns { success: false, error } when createPendingInvitation fails', async () => {
    const { createConnection } = await import('@/lib/db/connections')
    vi.mocked(createConnection).mockResolvedValueOnce({
      error: 'No account found for that email. Ask them to sign up first.',
    })
    const { createPendingInvitation } = await import('@/lib/db/pending-invitations')
    vi.mocked(createPendingInvitation).mockResolvedValueOnce({ error: 'DB write failed' })
    const { inviteConnection } = await import('@/app/(app)/connections/actions')
    const fd = new FormData()
    fd.set('email', 'nobody@example.com')
    fd.set('role', 'direct_report')
    const result = await inviteConnection({ success: false }, fd)
    expect(result.success).toBe(false)
    expect(result.error).toBe('DB write failed')
  })
})
```

- [ ] **Step 2: Run updated tests to confirm they fail on the new cases**

```bash
npm test -- --reporter=verbose __tests__/app/connections/actions.test.ts
```

Expected: The 3 original tests pass. The 4 new tests fail because the action still returns an error for "No account found".

- [ ] **Step 3: Replace app/(app)/connections/actions.ts**

```typescript
'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createConnection, acceptConnection } from '@/lib/db/connections'
import { createPendingInvitation } from '@/lib/db/pending-invitations'
import { logAudit } from '@/lib/audit'
import { sendEmail } from '@/lib/email/mailgun'
import { buildManagerInviteEmail } from '@/lib/email/templates/manager-invite'
import { buildConnectionInviteEmail } from '@/lib/email/templates/connection-invite'

export type InviteState = { success: boolean; error?: string }

const NO_ACCOUNT_ERROR = 'No account found for that email. Ask them to sign up first.'

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

  if (error === NO_ACCOUNT_ERROR) {
    const { error: inviteError } = await createPendingInvitation({
      inviterId: user.id,
      invitedEmail: email,
      inviterRole: role,
    })
    if (inviteError) return { success: false, error: inviteError }

    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', user.id)
      .single()
    const fromName = profile?.display_name ?? user.email ?? 'A colleague'

    const { subject, html } = buildConnectionInviteEmail({
      fromName,
      toEmail: email,
      inviterRole: role,
      personalMessage: message || undefined,
    })
    try {
      await sendEmail({ to: email, subject, html })
    } catch (e) {
      console.error('Connection invite email failed:', e)
    }

    await logAudit({
      actorId: user.id,
      action: 'connection.invite_pending',
      entityType: 'pending_invitation',
      metadata: { otherEmail: email, inviterRole: role },
    })

    revalidatePath('/people')
    return { success: true }
  }

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

- [ ] **Step 4: Run all action tests to confirm they pass**

```bash
npm test -- --reporter=verbose __tests__/app/connections/actions.test.ts
```

Expected: PASS — 7 tests

- [ ] **Step 5: Commit**

```bash
git add app/(app)/connections/actions.ts __tests__/app/connections/actions.test.ts
git commit -m "feat: pivot to pending invitation when invitee has no account"
```

---

### Task 5: Activate pending invites in confirmLogin

**Files:**
- Modify: `app/auth/confirm/actions.ts`
- Create: `__tests__/app/auth/confirm/actions.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// __tests__/app/auth/confirm/actions.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mocks = vi.hoisted(() => ({
  verifyOtp: vi.fn(),
  profilesUpsert: vi.fn(),
  pendingSelect: vi.fn(),
  pendingDelete: vi.fn(),
  connectionsInsert: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { verifyOtp: mocks.verifyOtp },
    from: (table: string) => {
      if (table === 'profiles') return { upsert: mocks.profilesUpsert }
      return {}
    },
  }),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn().mockReturnValue({
    from: (table: string) => {
      if (table === 'pending_invitations') {
        return {
          select: () => ({ eq: mocks.pendingSelect }),
          delete: () => ({ eq: mocks.pendingDelete }),
        }
      }
      if (table === 'connections') {
        return { insert: mocks.connectionsInsert }
      }
      return {}
    },
  }),
}))

vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`)
  }),
}))

describe('confirmLogin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    mocks.profilesUpsert.mockResolvedValue({ error: null })
    mocks.pendingSelect.mockResolvedValue({ data: [], error: null })
    mocks.pendingDelete.mockResolvedValue({ error: null })
    mocks.connectionsInsert.mockResolvedValue({ error: null })
  })

  it('redirects to /login when token_hash is missing', async () => {
    const { confirmLogin } = await import('@/app/auth/confirm/actions')
    const fd = new FormData()
    await expect(confirmLogin(fd)).rejects.toThrow('NEXT_REDIRECT:/login')
  })

  it('redirects to /dashboard on success when there are no pending invitations', async () => {
    mocks.verifyOtp.mockResolvedValue({
      data: { user: { id: 'user-1', email: 'user@example.com' } },
      error: null,
    })
    const { confirmLogin } = await import('@/app/auth/confirm/actions')
    const fd = new FormData()
    fd.set('token_hash', 'abc123')
    await expect(confirmLogin(fd)).rejects.toThrow('NEXT_REDIRECT:/dashboard')
    expect(mocks.connectionsInsert).not.toHaveBeenCalled()
  })

  it('creates an active connection when inviter_role is manager', async () => {
    mocks.verifyOtp.mockResolvedValue({
      data: { user: { id: 'new-user', email: 'new@example.com' } },
      error: null,
    })
    mocks.pendingSelect.mockResolvedValue({
      data: [{ id: 'inv-1', inviter_id: 'inviter-1', inviter_role: 'manager' }],
      error: null,
    })
    const { confirmLogin } = await import('@/app/auth/confirm/actions')
    const fd = new FormData()
    fd.set('token_hash', 'abc123')
    await expect(confirmLogin(fd)).rejects.toThrow('NEXT_REDIRECT:/dashboard')
    expect(mocks.connectionsInsert).toHaveBeenCalledWith({
      manager_id: 'inviter-1',
      direct_report_id: 'new-user',
      status: 'active',
      initiated_by: 'inviter-1',
    })
    expect(mocks.pendingDelete).toHaveBeenCalledWith('invited_email', 'new@example.com')
  })

  it('creates an active connection when inviter_role is direct_report', async () => {
    mocks.verifyOtp.mockResolvedValue({
      data: { user: { id: 'new-user', email: 'new@example.com' } },
      error: null,
    })
    mocks.pendingSelect.mockResolvedValue({
      data: [{ id: 'inv-2', inviter_id: 'inviter-2', inviter_role: 'direct_report' }],
      error: null,
    })
    const { confirmLogin } = await import('@/app/auth/confirm/actions')
    const fd = new FormData()
    fd.set('token_hash', 'abc123')
    await expect(confirmLogin(fd)).rejects.toThrow('NEXT_REDIRECT:/dashboard')
    expect(mocks.connectionsInsert).toHaveBeenCalledWith({
      manager_id: 'new-user',
      direct_report_id: 'inviter-2',
      status: 'active',
      initiated_by: 'inviter-2',
    })
  })

  it('redirects to error page when verifyOtp fails', async () => {
    mocks.verifyOtp.mockResolvedValue({
      data: { user: null },
      error: { message: 'Token expired' },
    })
    const { confirmLogin } = await import('@/app/auth/confirm/actions')
    const fd = new FormData()
    fd.set('token_hash', 'expired-token')
    await expect(confirmLogin(fd)).rejects.toThrow(
      'NEXT_REDIRECT:/auth/confirm?error=access_denied'
    )
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test -- --reporter=verbose __tests__/app/auth/confirm/actions.test.ts
```

Expected: FAIL — tests that assert `connectionsInsert` was called will fail because confirmLogin doesn't yet consume pending invitations.

- [ ] **Step 3: Update app/auth/confirm/actions.ts**

```typescript
'use server'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function confirmLogin(formData: FormData) {
  const tokenHash = formData.get('token_hash') as string | null
  if (!tokenHash) redirect('/login')

  const supabase = await createClient()
  const {
    data: { user },
    error: verifyError,
  } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'email' })

  if (verifyError) {
    redirect(
      `/auth/confirm?error=access_denied&error_description=${encodeURIComponent(verifyError.message)}`
    )
  }

  if (user) {
    await supabase.from('profiles').upsert(
      {
        id: user.id,
        email: user.email,
        display_name: user.email?.split('@')[0] ?? '',
      },
      { onConflict: 'id' }
    )

    const admin = createAdminClient()
    const { data: invites } = await admin
      .from('pending_invitations')
      .select('*')
      .eq('invited_email', user.email)

    if (invites && invites.length > 0) {
      for (const invite of invites) {
        const managerId =
          invite.inviter_role === 'manager' ? invite.inviter_id : user.id
        const directReportId =
          invite.inviter_role === 'direct_report' ? invite.inviter_id : user.id
        const { error } = await admin.from('connections').insert({
          manager_id: managerId,
          direct_report_id: directReportId,
          status: 'active',
          initiated_by: invite.inviter_id,
        })
        if (error && error.code !== '23505') {
          console.error('Failed to activate pending connection:', error)
        }
      }
      await admin
        .from('pending_invitations')
        .delete()
        .eq('invited_email', user.email)
    }
  }

  redirect('/dashboard')
}
```

- [ ] **Step 4: Run confirm actions tests**

```bash
npm test -- --reporter=verbose __tests__/app/auth/confirm/actions.test.ts
```

Expected: PASS — 5 tests

- [ ] **Step 5: Commit**

```bash
git add app/auth/confirm/actions.ts __tests__/app/auth/confirm/actions.test.ts
git commit -m "feat: activate pending invitations on registration in confirmLogin"
```

---

### Task 6: Full suite and verification

**Files:** None (verification only)

- [ ] **Step 1: Run the full test suite**

```bash
npm test
```

Expected: All tests pass. No regressions.

- [ ] **Step 2: Run a production build to check for type errors**

```bash
npm run build
```

Expected: Build completes with no TypeScript errors.

- [ ] **Step 3: Manual smoke test**

1. Start dev server: `npm run dev`
2. Sign in as an existing user
3. Open the "Add connection" form on `/people`
4. Enter an email address that does **not** have a Brilliant Managers account, select a role, click "Send invite"
5. Confirm the UI shows the green "Invite sent successfully." message (no red error)
6. Check your email inbox (or Mailgun logs) — confirm the invite email arrived with "Create your account →" linking to `/login`
7. Register as the invited user using that email address
8. After OTP confirmation, visit `/people` — confirm the connection appears as active immediately

- [ ] **Step 4: Final commit (if any cleanup needed)**

```bash
git add -p   # review any outstanding changes
git commit -m "chore: post-integration cleanup for pending invite flow"
```
