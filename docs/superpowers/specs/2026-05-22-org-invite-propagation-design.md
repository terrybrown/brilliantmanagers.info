# Org/Team Invite Propagation on Connection Accept — Design Spec

**Date:** 2026-05-22
**Status:** Approved

---

## Problem

When a direct report (DR) who belongs to an org/team invites their manager (or vice versa) and the connection is accepted, the other party has no visibility into that org/team. There is no continuity of the management hierarchy within the org structure.

## Goal

When a connection is accepted, automatically create a pending org node invitation for the acceptor on every org node the initiator belongs to (direct nodes only). Works symmetrically in both connection directions.

---

## Scope

- **In:** Pending invite created for each direct org node of the initiator when a connection is accepted.
- **In:** Both directions — DR-invites-manager and manager-invites-DR.
- **Out:** Parent/ancestor node propagation (intentionally excluded — managers can be added to parent levels separately).
- **Out:** Auto-adding the new member without their consent (pending invite only, not direct membership).
- **Out:** UI changes — the pending invite surfaces through the existing `/people` → Team & Org flow.
- **Out:** Notifications beyond the existing pending invite UI.

---

## Data Flow

In both connection directions:

```
orgMemberId  = conn.initiated_by   // person already in the org (the initiator)
newMemberId  = user.id             // the acceptor
```

On accept:
1. Fetch `newMemberEmail` from `profiles` for `newMemberId`
2. Call `propagateOrgNodeInvitesOnAccept(orgMemberId, newMemberEmail)`
3. Inside the function:
   a. Query `org_node_members` joined with `org_nodes` to get `(node_id, org_id)` pairs for `orgMemberId`
   b. For each node, check whether `newMemberId` is already a member — skip if so
   c. Upsert into `pending_org_node_invitations` with `inviter_id = orgMemberId`, `ignoreDuplicates: true`

The `UNIQUE (invited_email, node_id)` constraint makes repeated calls idempotent.

---

## Files

### Modified
- `lib/db/pending-org-node-invitations.ts` — add `propagateOrgNodeInvitesOnAccept`
- `app/(app)/connections/actions.ts` — call the new function from `acceptConnectionAction`

### New
- `__tests__/lib/db/pending-org-node-invitations.test.ts` — unit tests for the new function

---

## New Function

```ts
// lib/db/pending-org-node-invitations.ts
export async function propagateOrgNodeInvitesOnAccept(
  orgMemberId: string,
  newMemberEmail: string
): Promise<void>
```

Implementation:
- Uses `createAdminClient()` throughout (bypasses RLS; consistent with existing functions in the file)
- Single query fetching `org_node_members` joined to `org_nodes` for `org_id`
- Checks `org_node_members` for existing membership before upserting
- Throws on Supabase errors (consistent with rest of `lib/db/`)

---

## `acceptConnectionAction` Change

After the existing notification block, add:

```ts
const { data: newMemberProfile } = await supabase
  .from('profiles')
  .select('email')
  .eq('id', user.id)
  .single()

if (newMemberProfile?.email) {
  try {
    await propagateOrgNodeInvitesOnAccept(conn.initiated_by, newMemberProfile.email)
  } catch (e) {
    console.error('org invite propagation failed:', e)
  }
}
```

The try/catch ensures a failed org invite does not roll back or surface an error for the connection acceptance itself — the connection is already committed and its value should not be lost.

The action already fetches `conn.initiated_by` for the notification; no additional query needed for that field.

---

## Error Handling

| Scenario | Behaviour |
|---|---|
| `propagateOrgNodeInvitesOnAccept` throws | Logged to console, connection acceptance unaffected |
| `newMemberProfile` is null or has no email | Org invite propagation skipped silently |
| New member already in a node | That node skipped via `ignoreDuplicates: true`; others still processed |
| Node has no `org_id` | That node skipped gracefully |
| Duplicate call (idempotency) | `UNIQUE (invited_email, node_id)` + `ignoreDuplicates: true` absorbs it |

---

## Tests (`__tests__/lib/db/pending-org-node-invitations.test.ts`)

| Case | Expected |
|---|---|
| Initiator has no org node memberships | No inserts |
| Initiator has one direct node | One `pending_org_node_invitations` upsert with correct `inviter_id`, `org_id`, `node_id` |
| Initiator has multiple direct nodes | One upsert per node |
| New member is already in one of the nodes | That node skipped; others still invited |

---

## Spec Self-Review

- No placeholders or TBDs
- Data flow is consistent in both connection directions (initiator = org member, acceptor = new member)
- RLS bypass justified: admin client needed because `inviter_id` is the org member, not the authenticated acceptor
- Error handling is explicit and non-breaking
- No UI changes required — pending invite surfaces through existing flow
