# Org Chart Improvements — Design Spec

**Date:** 2026-05-20  
**Status:** Approved

## Problem

The org chart tool on `/people` has four issues:

1. Only top-level groups can be added — there is no UI for adding child nodes despite the server action and database supporting `parent_id`.
2. Double-clicking the "Add group" button submits twice — no in-flight guard exists.
3. No feedback when a group is saved — the node just appears with no indication of processing.
4. Adding people to org nodes only works for registered users via the existing email input; unregistered users cannot be invited into a node.

## Decisions

| Topic | Decision |
|---|---|
| Add-child UX | Always-visible `+ child` pill button on every row |
| Feedback pattern | Optimistic UI — node appears immediately in a "saving…" state |
| Member visibility | Stacked avatar circles on every row; click (admin only) to manage |
| People per node | One home — each person belongs to at most one node |
| Org-level membership | Not tracked separately; "in the org" means "in one of its nodes" |
| Add member flow | Email only — existing user → direct add; new user → invite + deferred placement |
| Autocomplete | Not in scope |

## Component Architecture

The existing `OrgHierarchy.tsx` (currently ~200 lines, one monolithic client component) is decomposed into four focused pieces:

```
components/org/
  OrgHierarchy.tsx    refactored — owns useOptimistic node list, passes callbacks down
  NodeRow.tsx         new — single row: collapse toggle, name, MemberStack, + child button + form
  AddNodeForm.tsx     new — inline input + submit button, uses useFormStatus for pending state
  MemberStack.tsx     new — avatar stack display + inline member management panel
```

### OrgHierarchy

- Receives `nodes: OrgNode[]`, `orgId: string`, `orgRole` from the page server component (unchanged)
- Holds `useOptimistic(nodes, (state, newNode) => [...state, newNode])` — the displayed node list
- Wraps `createNodeAction` in `startTransition`: dispatches optimistic node first, then calls the server action
- Passes wrapped action callbacks to `NodeRow` children
- Builds the tree from `optimisticNodes` (not `nodes`) via the existing `buildTree` helper

### NodeRow

- Renders one row at a given `depth`
- Local state: `addingChild: boolean` — whether the inline `AddNodeForm` is visible
- `+ child` button toggles `addingChild`; the button shows a filled/active state (▴ arrow) when open
- Only one child form open at a time — `OrgHierarchy` passes a `openChildFormId` / `setOpenChildFormId` pair so opening a new form closes any previously open one
- Renders `MemberStack` for the node's members
- Renders children by mapping `node.children` and calling a `renderNode` helper passed down from `OrgHierarchy` — `NodeRow` does not import itself (avoids circular dependency in the recursive tree)

### AddNodeForm

- Props: `orgId`, `parentId: string | null`, `onSubmit: (name: string) => void`, `onCancel: () => void`
- Uses `useFormStatus` (from `react-dom`) to read `pending` — disables input and button, shows spinner on button while pending
- On successful submit: calls `onSubmit(name)` then clears the input
- `✕` cancel button calls `onCancel` and collapses the form
- Used for both the inline child form (parentId = node.id) and the bottom top-level form (parentId = null)

### MemberStack

- Props: `members: OrgNodeMember[]`, `pendingInvites: PendingOrgNodeInvitation[]`, `nodeId`, `orgId`, `isAdmin`
- Displays up to 3 avatar circles (initials + colour), then a `+N` overflow circle
- Zero members: shows "0 people" text label instead
- Admin click on the stack toggles an inline member panel below the row
- Non-admins: avatars visible, no click action
- Member panel:
  - Confirmed members: chips with initials, name/email, ✕ remove button
  - Pending (awaiting registration): chips styled differently, labelled "awaiting registration", ✕ cancels the invite
  - Add-by-email input + "Add" button at the bottom of the panel
  - Inline error message below the input on failure (unknown email would be caught — but in the new flow, unknown email triggers an invite, so the only error is a malformed email)

## Optimistic Node Creation Flow

```
User types in AddNodeForm → clicks Add
  ↓
OrgHierarchy.handleAddNode(parentId, name):
  startTransition(() => {
    addOptimisticNode({ id: `provisional-${Date.now()}`, name, parent_id: parentId,
                        org_id: orgId, node_type: null, created_at: ..., members: [],
                        _provisional: true })
    await createNodeAction(formData)   // server action — unchanged
  })
  ↓
Provisional node renders immediately at correct depth:
  - dimmed opacity
  - italic name in accent colour
  - "saving…" label in amber
  - + child button disabled
  ↓
revalidatePath('/people') fires → page re-fetches real nodes
→ provisional entry replaced by the real node
  ↓
On error: React rolls back optimistic state automatically;
  AddNodeForm shows inline error text
```

The `buildTree` function requires no changes — provisional nodes carry `parent_id` so they slot into the correct position.

## Add Member Flow

### Existing registered user

`addMemberToNodeAction` currently returns `NO_ACCOUNT_ERROR` when the profile lookup returns null. This changes: instead of returning an error, the action branches on whether a profile exists.

If a profile is found: inserts into `org_node_members` (existing behaviour, unchanged).

### Unregistered user (new)

When `addMemberToNodeAction` finds no profile for the given email:

1. Creates a row in the new `pending_org_node_invitations` table (see below)
2. Sends an invite email (new template: "You've been invited to join [Org Name] / [Node Name]")
3. Returns success to the UI — the pending invite appears in `MemberStack` as "awaiting registration"

On OTP confirm (`/auth/confirm/actions.ts`), after the existing pending_invitations processing:

4. Queries `pending_org_node_invitations` for the newly registered user's email
5. Inserts into `org_node_members` for each matching pending record
6. Deletes the processed `pending_org_node_invitations` rows

## Database

### New table: `pending_org_node_invitations`

```sql
CREATE TABLE pending_org_node_invitations (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_email text        NOT NULL,
  org_id        uuid        NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  node_id       uuid        NOT NULL REFERENCES org_nodes(id) ON DELETE CASCADE,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (invited_email, node_id)
);

ALTER TABLE pending_org_node_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inviter_select" ON pending_org_node_invitations
  FOR SELECT USING (inviter_id = auth.uid());

CREATE POLICY "inviter_insert" ON pending_org_node_invitations
  FOR INSERT WITH CHECK (inviter_id = auth.uid());

-- Deletion via service role (OTP confirm hook) — no user DELETE policy needed

CREATE INDEX ON pending_org_node_invitations (invited_email);
CREATE INDEX ON pending_org_node_invitations (node_id);
```

### `getNodesForOrg` update

The existing query must be extended to also fetch `pending_org_node_invitations` for each node, so `MemberStack` can display "awaiting registration" entries. This is done in `lib/db/org-nodes.ts` — add a second query for pending invites and attach them to each node's data.

### `OrgNode` type update

```ts
export interface OrgNode {
  // existing fields …
  members: { user_id: string; email: string | null; display_name: string | null }[]
  pendingInvites: { id: string; invited_email: string }[]   // new
}
```

## Email

New template: `lib/email/templates/org-node-invite.ts`

Subject: `You've been invited to join [org name] on Brilliant Managers`

Body: explains they've been added to [node name] within [org name], and that clicking the link will create their account and place them there automatically.

Uses the same Mailgun sending path as the existing invite emails.

## Error Handling

| Scenario | Behaviour |
|---|---|
| Node create fails | React rolls back optimistic state; inline error below `AddNodeForm` |
| Add member — malformed email | Inline error in `MemberStack` panel, no server call |
| Add member — invite send fails | Log error server-side, still show pending chip (invite can be resent manually) |
| OTP confirm — org node insert fails | Log error, do not block sign-in; user can be re-added manually |

## Testing

- `NodeRow` — renders `+ child` button; toggles `addingChild` state; only one form open at a time
- `AddNodeForm` — disables button during `useFormStatus` pending; clears on submit; shows error on failure
- `MemberStack` — renders correct avatar count; shows overflow `+N`; renders pending invite chips
- `lib/db/org-nodes.ts` — `getNodesForOrg` returns `pendingInvites` attached to correct nodes
- `lib/db/pending-org-node-invitations.ts` — create, fetch by email, delete
- OTP confirm — processes `pending_org_node_invitations` and inserts to `org_node_members`

## Out of Scope

- Name/email autocomplete for adding members
- Org-level (non-node) membership tracking or unplaced member counts
- Moving a person between nodes (reassignment UI)
- Deleting or renaming nodes (existing functionality, not changed)
