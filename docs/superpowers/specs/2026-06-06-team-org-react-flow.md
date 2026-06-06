# Spec B — Team & Org: React Flow Org Chart + Side Panel + Admin Direct-Link

**Date:** 2026-06-06  
**Status:** Approved  
**Depends on:** Spec A shipped first (not a hard dependency, can be developed in parallel)

---

## Goal

Replace the current table-row org hierarchy with an interactive React Flow canvas showing departments as visual nodes connected by edges. Clicking a node opens a side panel showing members with inline actions for department membership and manager/subordinate linking. Org admins can directly link existing platform users as manager/direct report without requiring invitation consent.

---

## New Dependencies

```bash
npm install @xyflow/react @dagrejs/dagre
```

- `@xyflow/react` — React Flow v12, the canvas, zoom/pan, custom nodes
- `@dagrejs/dagre` — automatic top-down tree layout (positions nodes without manual x/y)

---

## Architecture

### Data model (unchanged)

The existing `OrgNode` type already includes everything needed:

```ts
type OrgNode = {
  id: string
  name: string
  parent_id: string | null
  org_id: string
  node_type: string | null
  members: { id: string; display_name: string | null; email: string; avatar_path?: string }[]
  pendingInvites: { email: string; id: string }[]
  created_at: string
}
```

No database migrations required for the org chart itself.

### Layout utility — `lib/org/layout.ts` (new)

Pure function: takes `OrgNode[]`, returns React Flow `nodes[]` and `edges[]` with x/y positions computed by dagre.

```ts
export function buildOrgLayout(nodes: OrgNode[]): {
  rfNodes: Node[]   // React Flow nodes with position
  rfEdges: Edge[]   // React Flow edges (parent_id → child)
}
```

- Dagre direction: `TB` (top-to-bottom)
- Node size hint: 160×48px
- Node separation: 24px horizontal, 60px vertical
- Returns stable positions — same input always produces same output (no randomness)

### `OrgFlowChart.tsx` (replaces `OrgHierarchy.tsx`)

Client component. Receives `nodes: OrgNode[]`, `orgId: string`, `orgRole: 'org_admin' | 'member' | null`.

**Responsibilities:**
- Calls `buildOrgLayout(nodes)` to get positioned RF nodes/edges
- Renders `<ReactFlow>` canvas with:
  - `fitView` on mount
  - `nodesDraggable={false}` — layout is algorithmic, not manual
  - `nodesConnectable={false}` — connections are made via the side panel, not by dragging edges
  - Custom node type: `DeptNode` (see below)
  - `MiniMap` (optional, admin only)
  - Zoom controls (`Controls` component from React Flow)
- Tracks `selectedNodeId: string | null`
- On node click: sets `selectedNodeId`
- Renders `OrgNodePanel` alongside the canvas when `selectedNodeId !== null`
- Admin-only: "+ Add top-level group" button above the canvas (inline form, same UX as current `OrgHierarchy`)

**Canvas layout:**
```
┌─────────────────────────────────────────────┐
│  [React Flow canvas — zoom/pan]  │ OrgNodePanel │
│  [+ Add top-level group] (admin) │  (320px)     │
└─────────────────────────────────────────────┘
```

Height: `calc(100vh - 320px)`, min-height 400px.

### `DeptNode` — custom React Flow node (new)

Sage-styled department box:
- Background: `--color-surface`, border: `--color-border`, border-radius: `--radius`
- Selected state: border `--color-accent`, background `--color-accent-wash`
- Content: department name (font-weight 600, 13px) + member count badge
- Handle positions: top (target) + bottom (source) for edge connections

### `OrgNodePanel.tsx` (new)

Rendered alongside the canvas when a node is selected. Width: 320px. Receives:
- `node: OrgNode` — the selected node's full data
- `orgId: string`
- `orgRole: 'org_admin' | 'member' | null`
- `currentUserId: string`
- `onClose: () => void`

**Panel sections:**

**Header:** node name + member count + close button (×)

**Members list:** for each member in `node.members`:
- Avatar (initials, deterministic color), display name, role/email
- Inline action button — determined by the relationship between `currentUserId` and this member:
  - Already connected as their manager → chip "Your DR" (no action)
  - Already connected as their direct report → chip "Your manager" (no action)  
  - No connection, both in org, caller is org admin → "Set as manager" / "Add as DR" dropdown or two buttons
  - No connection, caller is not admin → "Invite" (opens email invite flow)
- "Remove from dept" button (admin only, ghost, destructive)

**Pending invites:** list of `node.pendingInvites` with email + "Cancel" button (admin only)

**Add person input:**
- Text input: searches all users in the org by name or email (not just this node's current members)
- If match found (existing org member): adds them to the node via `addMemberToNodeAction`
- If no match: treats input as email, sends invite via `inviteConnection` with a note that they'll be added to this dept on acceptance
- Submit button: "Add"

**Add subgroup form** (admin only, collapsible):
- Dashed "+ Add subgroup" button → expands inline name input + Create/Cancel
- Submits via existing `createNodeAction`

---

## New Server Action — `createDirectConnection`

**Location:** `app/(app)/people/actions.ts` (new file for people-page actions, or add to `connections/actions.ts`)

**Signature:**
```ts
export async function createDirectConnection(
  targetUserId: string,
  role: 'manager' | 'direct_report'  // role of target relative to current user
): Promise<{ ok: boolean; error?: string }>
```

**Logic:**
1. Auth: get current user; reject if not authenticated
2. Org admin check: verify current user is `org_admin` in at least one shared org with `targetUserId`; return error if not
3. Duplicate check: query connections table for existing connection between the two users; return "Already connected" if found
4. Insert connection record with `status = 'active'` directly (no pending state)
5. Create in-app notification for `targetUserId`: "You've been connected as [manager/direct report] by [name]"
6. `revalidatePath('/people')`
7. Return `{ ok: true }`

**RLS / security:** action runs with service role (server-side only); RLS on the connections table is not bypassed for reads — only this action writes with service role. Add server-side auth + org-admin check as the security gate.

---

## OrgSection.tsx updates

Currently renders `OrgHierarchy`. Change to render `OrgFlowChart`. Pass through same props (`nodes`, `orgId`, `orgRole`). The `OrgSection` wrapper (org switcher, empty state) stays unchanged.

---

## Error Handling

| Scenario | Behaviour |
|---|---|
| Direct link: already connected | Toast "Already connected" |
| Direct link: not org admin | Toast "Only org admins can link people directly" |
| Add to node: already a member | Toast "Already in this group" |
| Add subgroup: empty name | Client-side validation, no submit |
| Subgroup create: server error | Toast with error message |
| React Flow node with no members | Panel shows "No members yet" + Add person input |

---

## Testing

- **Unit:** `buildOrgLayout` — given flat `OrgNode[]` with parent_id relationships, returns correct edge list and non-overlapping positions
- **Unit:** `createDirectConnection` — auth check fails for non-admin, duplicate check prevents double-connect, happy path creates active connection
- **Unit:** `OrgNodePanel` — renders member list, inline action buttons conditional on relationship state, Add person input visible
- **Delete:** existing `NodeRow.test.tsx` and `OrgHierarchy` tests (components being replaced)
- **Update:** `OrgSection` test — now expects `OrgFlowChart` instead of `OrgHierarchy`

---

## Files Changed / Created

| File | Change |
|---|---|
| `components/org/OrgFlowChart.tsx` | New — replaces OrgHierarchy |
| `components/org/DeptNode.tsx` | New — custom React Flow node |
| `components/org/OrgNodePanel.tsx` | New — side panel |
| `lib/org/layout.ts` | New — dagre layout utility |
| `app/(app)/people/actions.ts` | New — `createDirectConnection` action |
| `app/(app)/people/OrgSection.tsx` | Update: render OrgFlowChart not OrgHierarchy |
| `components/org/OrgHierarchy.tsx` | Delete |
| `components/org/NodeRow.tsx` | Delete |
| `components/org/AddNodeForm.tsx` | Delete (logic absorbed into OrgNodePanel + OrgFlowChart) |
| `__tests__/components/org/*` | Update/delete as above |
| `package.json` | Add @xyflow/react, @dagrejs/dagre |
