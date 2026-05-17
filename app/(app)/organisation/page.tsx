import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getOrgsForUser, type Org } from '@/lib/db/organisations'
import { getNodesForOrg, type OrgNode } from '@/lib/db/org-nodes'
import { getOrgMembers, type OrgMember } from '@/lib/db/org-members'
import { getOrgRole } from '@/lib/auth/roles'
import {
  createOrgAction,
  updateOrgNameAction,
  createNodeAction,
  deleteNodeAction,
  addMemberToNodeVoidAction,
  removeMemberFromNodeAction,
  promoteMemberAction,
  demoteMemberAction,
} from './actions'

// ── Page entry ────────────────────────────────────────────────────────────────

export default async function OrganisationPage({
  searchParams,
}: {
  searchParams: Promise<{ org?: string; addError?: string }>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const orgs = await getOrgsForUser(user.id)

  if (orgs.length === 0) {
    return (
      <div className="mx-auto max-w-5xl">
        <h1 className="mb-2 text-2xl font-bold text-white">Organisation</h1>
        <p className="mb-8 text-sm text-slate-400">
          Create an organisation to manage your reporting hierarchy.
        </p>
        <CreateOrgForm />
      </div>
    )
  }

  const params = await searchParams
  const selectedOrgId = params.org ?? orgs[0].id
  const addError = params.addError
  const selectedOrg = orgs.find(o => o.id === selectedOrgId) ?? orgs[0]

  const [nodes, members, role] = await Promise.all([
    getNodesForOrg(selectedOrg.id),
    getOrgMembers(selectedOrg.id),
    getOrgRole(user.id, selectedOrg.id),
  ])

  const isAdmin = role === 'org_admin'

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-2 text-2xl font-bold text-white">Organisation</h1>
      <p className="mb-6 text-sm text-slate-400">
        Manage your organisation, teams, and reporting hierarchy.
      </p>

      {orgs.length > 1 && <OrgPicker orgs={orgs} selectedOrgId={selectedOrg.id} />}

      <OrgHeader org={selectedOrg} isAdmin={isAdmin} />

      {addError && (
        <div className="mb-4 mt-4 rounded-lg bg-red-900/30 px-4 py-2 text-sm text-red-400">
          {addError}
        </div>
      )}

      <div className="mt-6 flex flex-col gap-6 lg:flex-row">
        <section className="flex-1 min-w-0" style={{ flex: '2' }}>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Hierarchy
          </h2>
          {nodes.length === 0 ? (
            <div
              className="rounded-xl px-5 py-4"
              style={{ background: '#1e293b', border: '1px solid #334155' }}
            >
              <p className="text-sm text-slate-400">No nodes yet.</p>
              {isAdmin && (
                <div className="mt-3">
                  <AddNodeForm orgId={selectedOrg.id} parentId={null} label="Add root node" />
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <NodeTree
                nodes={nodes}
                parentId={null}
                depth={0}
                orgId={selectedOrg.id}
                currentUserId={user.id}
                isAdmin={isAdmin}
              />
              {isAdmin && (
                <div className="mt-1">
                  <AddNodeForm orgId={selectedOrg.id} parentId={null} label="+ Add root node" />
                </div>
              )}
            </div>
          )}
        </section>

        <section style={{ flex: '1', minWidth: 0 }}>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Members
          </h2>
          <MembersPanel
            members={members}
            currentUserId={user.id}
            orgId={selectedOrg.id}
            isAdmin={isAdmin}
          />
        </section>
      </div>
    </div>
  )
}

// ── Org picker ────────────────────────────────────────────────────────────────

function OrgPicker({
  orgs,
  selectedOrgId,
}: {
  orgs: Org[]
  selectedOrgId: string
}) {
  return (
    <nav className="mb-6 flex flex-wrap gap-2">
      {orgs.map(org => {
        const isSelected = org.id === selectedOrgId
        return (
          <a
            key={org.id}
            href={`/organisation?org=${org.id}`}
            className={[
              'rounded-full px-3 py-1 text-xs font-semibold transition-colors',
              isSelected
                ? 'bg-amber-500 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600',
            ].join(' ')}
          >
            {org.name}
          </a>
        )
      })}
    </nav>
  )
}

// ── Org header ────────────────────────────────────────────────────────────────

function OrgHeader({ org, isAdmin }: { org: Org; isAdmin: boolean }) {
  return (
    <div
      className="flex flex-col gap-3 rounded-xl px-5 py-4 sm:flex-row sm:items-center"
      style={{ background: '#1e293b', border: '1px solid #334155' }}
    >
      <div className="flex-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          {org.userRole === 'org_admin' ? 'OrgAdmin' : 'Member'}
        </p>
        <h2 className="mt-0.5 text-lg font-bold text-white">{org.name}</h2>
      </div>
      {isAdmin && (
        <form action={updateOrgNameAction} className="flex gap-2">
          <input type="hidden" name="orgId" value={org.id} />
          <input
            name="name"
            defaultValue={org.name}
            required
            className="w-44 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
            aria-label="Organisation name"
          />
          <button
            type="submit"
            className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-400"
          >
            Rename
          </button>
        </form>
      )}
    </div>
  )
}

// ── Node tree ─────────────────────────────────────────────────────────────────

function NodeTree({
  nodes,
  parentId,
  depth,
  orgId,
  currentUserId,
  isAdmin,
}: {
  nodes: OrgNode[]
  parentId: string | null
  depth: number
  orgId: string
  currentUserId: string
  isAdmin: boolean
}) {
  const children = nodes.filter(n => n.parent_id === parentId)
  if (children.length === 0) return null

  return (
    <>
      {children.map(node => (
        <NodeCard
          key={node.id}
          node={node}
          nodes={nodes}
          depth={depth}
          orgId={orgId}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
        />
      ))}
    </>
  )
}

function NodeCard({
  node,
  nodes,
  depth,
  orgId,
  currentUserId,
  isAdmin,
}: {
  node: OrgNode
  nodes: OrgNode[]
  depth: number
  orgId: string
  currentUserId: string
  isAdmin: boolean
}) {
  const isCurrentUserNode = node.members.some(m => m.user_id === currentUserId)

  return (
    <div style={{ marginLeft: `${depth * 20}px` }} className="flex flex-col gap-1">
      <div
        className={[
          'rounded-xl px-4 py-3',
          isCurrentUserNode ? 'ring-1 ring-amber-500/40' : '',
        ].join(' ')}
        style={{ background: '#1e293b', border: '1px solid #334155' }}
      >
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-white">{node.name}</span>
              {node.node_type && (
                <span className="rounded-full bg-slate-700 px-2 py-0.5 text-xs text-slate-300">
                  {node.node_type}
                </span>
              )}
            </div>

            {node.members.length > 0 && (
              <ul className="mt-2 flex flex-col gap-1">
                {node.members.map(member => (
                  <li key={member.user_id} className="flex items-center gap-2">
                    <span className="text-xs text-slate-300">
                      {member.display_name ?? member.email ?? member.user_id}
                    </span>
                    {isAdmin && (
                      <form action={removeMemberFromNodeAction}>
                        <input type="hidden" name="orgId" value={orgId} />
                        <input type="hidden" name="nodeId" value={node.id} />
                        <input type="hidden" name="userId" value={member.user_id} />
                        <button
                          type="submit"
                          className="text-xs text-slate-500 hover:text-red-400"
                          aria-label={`Remove ${member.display_name ?? member.email ?? member.user_id} from node`}
                        >
                          ✕
                        </button>
                      </form>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {isAdmin && (
            <div className="flex shrink-0 flex-wrap gap-1">
              <form action={deleteNodeAction}>
                <input type="hidden" name="orgId" value={orgId} />
                <input type="hidden" name="nodeId" value={node.id} />
                <button
                  type="submit"
                  className="rounded px-2 py-1 text-xs text-slate-500 hover:bg-red-900/30 hover:text-red-400"
                  aria-label={`Delete node ${node.name}`}
                >
                  Delete node & children
                </button>
              </form>
            </div>
          )}
        </div>

        {isAdmin && (
          <div className="mt-3 flex flex-col gap-2">
            <AddNodeForm orgId={orgId} parentId={node.id} label="+ Child" />
            <AddMemberForm orgId={orgId} nodeId={node.id} />
          </div>
        )}
      </div>

      <NodeTree
        nodes={nodes}
        parentId={node.id}
        depth={depth + 1}
        orgId={orgId}
        currentUserId={currentUserId}
        isAdmin={isAdmin}
      />
    </div>
  )
}

// ── Add node form ─────────────────────────────────────────────────────────────

function AddNodeForm({
  orgId,
  parentId,
  label,
}: {
  orgId: string
  parentId: string | null
  label: string
}) {
  return (
    <form action={createNodeAction} className="flex flex-wrap gap-1">
      <input type="hidden" name="orgId" value={orgId} />
      {parentId && <input type="hidden" name="parentId" value={parentId} />}
      <input
        name="name"
        required
        placeholder="Node name"
        className="w-32 rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
        aria-label="Node name"
      />
      <input
        name="nodeType"
        placeholder="Type (optional)"
        className="w-28 rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
        aria-label="Node type"
      />
      <button
        type="submit"
        className="rounded-lg bg-slate-700 px-2 py-1 text-xs font-semibold text-slate-200 hover:bg-slate-600"
      >
        {label}
      </button>
    </form>
  )
}

// ── Add member to node form ───────────────────────────────────────────────────

function AddMemberForm({ orgId, nodeId }: { orgId: string; nodeId: string }) {
  return (
    <form action={addMemberToNodeVoidAction} className="flex flex-wrap gap-1">
      <input type="hidden" name="orgId" value={orgId} />
      <input type="hidden" name="nodeId" value={nodeId} />
      <input
        name="email"
        type="email"
        required
        placeholder="email@example.com"
        className="w-44 rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
        aria-label="Member email"
      />
      <button
        type="submit"
        className="rounded-lg bg-slate-700 px-2 py-1 text-xs font-semibold text-slate-200 hover:bg-slate-600"
      >
        + Person
      </button>
    </form>
  )
}

// ── Create org form ───────────────────────────────────────────────────────────

function CreateOrgForm() {
  return (
    <div
      className="rounded-xl px-5 py-6"
      style={{ background: '#1e293b', border: '1px solid #334155' }}
    >
      <h2 className="mb-1 text-sm font-semibold text-white">Create an organisation</h2>
      <p className="mb-4 text-xs text-slate-400">
        Give your organisation a name to get started.
      </p>
      <form action={createOrgAction} className="flex flex-col gap-3 sm:flex-row">
        <input
          name="name"
          required
          placeholder="Organisation name"
          className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
          aria-label="Organisation name"
        />
        <button
          type="submit"
          className="rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-400"
        >
          Create
        </button>
      </form>
    </div>
  )
}

// ── Members panel ─────────────────────────────────────────────────────────────

function MembersPanel({
  members,
  currentUserId,
  orgId,
  isAdmin,
}: {
  members: OrgMember[]
  currentUserId: string
  orgId: string
  isAdmin: boolean
}) {
  return (
    <div className="flex flex-col gap-2">
      {members.map(member => {
        const isCurrentUser = member.user_id === currentUserId
        const label = member.display_name ?? member.email ?? member.user_id
        const roleLabel = member.role === 'org_admin' ? 'OrgAdmin' : 'Member'

        return (
          <div
            key={member.user_id}
            className="flex items-center gap-3 rounded-xl px-4 py-3"
            style={{ background: '#1e293b', border: '1px solid #334155' }}
          >
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-semibold text-white">
                {label}
                {isCurrentUser && (
                  <span className="ml-2 text-xs font-normal text-amber-400">(you)</span>
                )}
              </p>
              <p className="text-xs text-slate-400">{roleLabel}</p>
            </div>

            {isAdmin && !isCurrentUser && (
              <div className="flex shrink-0 gap-1">
                {member.role === 'member' ? (
                  <form action={promoteMemberAction}>
                    <input type="hidden" name="orgId" value={orgId} />
                    <input type="hidden" name="userId" value={member.user_id} />
                    <button
                      type="submit"
                      className="rounded px-2 py-1 text-xs text-slate-400 hover:bg-slate-700 hover:text-amber-400"
                      aria-label={`Promote ${label} to OrgAdmin`}
                    >
                      Promote
                    </button>
                  </form>
                ) : (
                  <form action={demoteMemberAction}>
                    <input type="hidden" name="orgId" value={orgId} />
                    <input type="hidden" name="userId" value={member.user_id} />
                    <button
                      type="submit"
                      className="rounded px-2 py-1 text-xs text-slate-400 hover:bg-slate-700 hover:text-red-400"
                      aria-label={`Demote ${label} to Member`}
                    >
                      Demote
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
