# Invite Unregistered User Flow

**Date:** 2026-05-20
**Status:** Approved

## Problem

When a user tries to add a connection via the "Add connection" form or the "Invite your manager" modal, the action currently fails with "No account found for that email. Ask them to sign up first." if the other person hasn't registered yet. This forces an out-of-band conversation before the connection can be made, creating unnecessary friction.

## Goal

A single email should let the recipient register and have their connection auto-activated — no manual coordination required.

## Behaviour

**If the invited email has an existing profile:** Behave exactly as today — create a pending connection row. The existing conditional email (sent by `inviteConnection` when `role === 'direct_report'`) is unchanged.

**If the invited email has no profile:** Create a `pending_invitations` record, send an invite email prompting them to create an account, and return success to the UI. When they register and verify their OTP, their connections are created automatically as `active`.

## Data Model

### New table: `pending_invitations`

```sql
CREATE TABLE pending_invitations (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_email text        NOT NULL,
  inviter_role  text        NOT NULL CHECK (inviter_role IN ('manager', 'direct_report')),
  created_at    timestamptz NOT NULL DEFAULT now()
);
```

`inviter_role` is the inviter's role in the relationship:
- `'manager'` → inviter is the manager, invitee will be the direct report
- `'direct_report'` → inviter is the direct report, invitee will be the manager

When converting to a connection on registration:
- `manager_id = inviter_role === 'manager' ? inviter_id : new_user_id`
- `direct_report_id = inviter_role === 'direct_report' ? inviter_id : new_user_id`

### RLS

```sql
ALTER TABLE pending_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inviter_select" ON pending_invitations
  FOR SELECT USING (inviter_id = auth.uid());

CREATE POLICY "inviter_insert" ON pending_invitations
  FOR INSERT WITH CHECK (inviter_id = auth.uid());
```

Deletion is performed server-side using the service role key (bypasses RLS), since the invitee has no policies at registration time.

## Files Changed

### `supabase/migrations/<timestamp>_pending_invitations.sql`
New migration creating the table and RLS policies above.

### `lib/db/connections.ts`
Add `createPendingInvitation()`:

```ts
export async function createPendingInvitation(params: {
  inviterId: string
  invitedEmail: string
  inviterRole: 'manager' | 'direct_report'
}): Promise<{ error?: string }>
```

Uses the standard server client (inviter is authenticated, INSERT policy allows it).

### `app/(app)/connections/actions.ts`

In `inviteConnection`, after `createConnection()` returns the "No account found" error, pivot to:

1. Call `createPendingInvitation({ inviterId: user.id, invitedEmail: email, inviterRole: role })`
2. Send the new `connection-invite` email (see below)
3. Return `{ success: true }`

Any other error from `createConnection()` (duplicate, DB error) still surfaces as an error.

### `lib/email/templates/connection-invite.ts`

New template. Parameters:

```ts
interface ConnectionInviteEmailParams {
  fromName: string   // inviter's display_name or email
  toEmail: string
  inviterRole: 'manager' | 'direct_report'
  personalMessage?: string
}
```

- **Subject:** `"{fromName} has invited you to join Brilliant Managers"`
- **Body:** explains the relationship direction
  - `manager` → "has invited you as one of their direct reports"
  - `direct_report` → "has invited you as their manager"
- **CTA:** "Create your account →" → `${appUrl}/login`
- **Footer:** "You'll need to create a free account to accept this connection."

The existing `manager-invite.ts` template is unchanged — it is used when the invitee already has an account (InviteManagerModal existing-user path).

### `app/auth/confirm/actions.ts`

In `confirmLogin`, after the profile upsert succeeds, add:

```
1. Create a service role Supabase client
2. SELECT * FROM pending_invitations WHERE invited_email = user.email
3. For each row:
   a. Resolve manager_id / direct_report_id from inviter_role
   b. INSERT into connections (manager_id, direct_report_id, status='active', initiated_by=inviter_id)
   c. Ignore duplicate connection errors (23505)
4. DELETE FROM pending_invitations WHERE invited_email = user.email
5. Continue to redirect('/dashboard')
```

The service role client is required because the newly registered user has no SELECT policy on `pending_invitations` rows created by others.

### `lib/supabase/admin.ts` (new or existing)

Export a `createAdminClient()` that uses `SUPABASE_SERVICE_ROLE_KEY`. Used only in server-side code. Never exported from any client-facing module.

## UI

**`AddConnectionForm`:** No code change needed. The action returns `{ success: true }` for both existing and non-existing users, so the existing green "Invite sent successfully." state already shows. The red "No account found" error disappears naturally.

**`InviteManagerModal`:** No code change needed.

**Success copy (optional polish):** The success messages could be updated to "Invite sent — we've emailed them to join Brilliant Managers." to be accurate for the unregistered case, but this is not required for the feature to work.

## Out of Scope

- Expiry of pending invitations (nice-to-have; can be added as a cron job later)
- Cancelling a pending invitation
- Notifying the inviter when the invitee registers and the connection activates
- Sending a notification email when an existing user receives a connection request
