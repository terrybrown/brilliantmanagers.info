'use client'
import type { ReactNode } from 'react'
import type { OrgNode } from '@/lib/db/org-nodes'
import { MemberStack } from './MemberStack'
import { AddNodeForm } from './AddNodeForm'
import {
  addMemberToNodeAction,
  removeMemberFromNodeAction,
  cancelPendingOrgNodeInvitationAction,
} from '@/app/(app)/organisation/actions'
import { useMutation } from '@/hooks/use-mutation'

export interface OrgNodeWithChildren extends OrgNode {
  children: OrgNodeWithChildren[]
}

// ── Member panel sub-components ───────────────────────────────────────────────

const AVATAR_COLORS = [
  '#4f46e5', '#0891b2', '#059669', '#7c3aed',
  '#b45309', '#be185d', '#0e7490', '#15803d',
]
function avatarColor(id: string): string {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0
  return AVATAR_COLORS[(h >>> 0) % AVATAR_COLORS.length]
}
function initials(name: string | null, email: string | null): string {
  const src = name ?? email ?? '?'
  return src.slice(0, 2).toUpperCase()
}

function RemoveMemberButton({ nodeId, orgId, userId }: { nodeId: string; orgId: string; userId: string }) {
  const { mutate, isPending } = useMutation({ onSuccess: 'Member removed' })
  return (
    <button
      type="button"
      onClick={() => {
        const fd = new FormData()
        fd.set('nodeId', nodeId)
        fd.set('userId', userId)
        fd.set('orgId', orgId)
        mutate(() => removeMemberFromNodeAction(fd))
      }}
      disabled={isPending}
      style={{ background: 'none', border: 'none', color: isPending ? '#4b5563' : '#6b7280', cursor: isPending ? 'default' : 'pointer', fontSize: 12, padding: '0 0 0 4px', lineHeight: 1 }}
    >
      ✕
    </button>
  )
}

function CancelInviteButton({ invitationId, orgId }: { invitationId: string; orgId: string }) {
  const { mutate, isPending } = useMutation({ onSuccess: 'Invite cancelled' })
  return (
    <button
      type="button"
      onClick={() => {
        const fd = new FormData()
        fd.set('orgId', orgId)
        fd.set('invitationId', invitationId)
        mutate(() => cancelPendingOrgNodeInvitationAction(fd))
      }}
      disabled={isPending}
      style={{ background: 'none', border: 'none', color: isPending ? '#4b5563' : '#6b7280', cursor: isPending ? 'default' : 'pointer', fontSize: 12, padding: '0 0 0 4px', lineHeight: 1 }}
    >
      ✕
    </button>
  )
}

function AddMemberForm({ nodeId, orgId }: { nodeId: string; orgId: string }) {
  const { mutate, isPending } = useMutation({ onSuccess: 'Member added' })
  return (
    <form
      style={{ display: 'flex', gap: 6, flex: 1 }}
      onSubmit={e => {
        e.preventDefault()
        const fd = new FormData(e.currentTarget)
        fd.set('orgId', orgId)
        fd.set('nodeId', nodeId)
        mutate(() => addMemberToNodeAction(fd))
      }}
    >
      <input
        name="email"
        type="email"
        placeholder="Add member by email…"
        disabled={isPending}
        style={{
          flex: 1, background: '#0d1117', border: '1px solid #1f2937',
          color: '#f1f5f9', padding: '5px 8px', borderRadius: 4, fontSize: 12,
          outline: 'none', maxWidth: 280,
        }}
      />
      <button
        type="submit"
        disabled={isPending}
        style={{
          background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.3)',
          color: '#a78bfa', padding: '5px 10px', borderRadius: 4, fontSize: 12,
          cursor: isPending ? 'default' : 'pointer', opacity: isPending ? 0.6 : 1,
        }}
      >
        {isPending ? '…' : 'Add'}
      </button>
    </form>
  )
}

// ── People button label ───────────────────────────────────────────────────────

function peopleButtonLabel(
  members: OrgNode['members'],
  pendingInvites: OrgNode['pendingInvites'],
  isOpen: boolean
): string {
  const n = members.length
  const p = pendingInvites.length
  const arrow = isOpen ? ' ▴' : n > 0 || p > 0 ? ' ▾' : ''

  if (n === 0 && p === 0) return '+ People'
  if (n === 0) return `${p} pending${arrow}`
  if (p === 0) return `${n} people${arrow}`
  return `${n} people · ${p} pending${arrow}`
}

// ── NodeRow ───────────────────────────────────────────────────────────────────

interface NodeRowProps {
  node: OrgNodeWithChildren
  depth: number
  orgId: string
  isAdmin: boolean
  isCollapsed: boolean
  onToggleCollapse: () => void
  openMemberPanelId: string | null
  setOpenMemberPanelId: (id: string | null) => void
  openChildFormId: string | null
  setOpenChildFormId: (id: string | null) => void
  addNodeFormAction: (parentId: string) => (formData: FormData) => Promise<void>
  renderNode: (node: OrgNodeWithChildren, depth: number) => ReactNode
}

export function NodeRow({
  node,
  depth,
  orgId,
  isAdmin,
  isCollapsed,
  onToggleCollapse,
  openMemberPanelId,
  setOpenMemberPanelId,
  openChildFormId,
  setOpenChildFormId,
  addNodeFormAction,
  renderNode,
}: NodeRowProps) {
  const isProvisional = node.id.startsWith('provisional-')
  const isChildFormOpen = openChildFormId === node.id && !isProvisional
  const isMemberPanelOpen = openMemberPanelId === node.id

  const paddingLeft = 14 + depth * 18

  return (
    <div>
      {/* Node row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: `8px 14px 8px ${paddingLeft}px`,
          borderBottom: '1px solid rgba(255,255,255,0.04)',
          opacity: isProvisional ? 0.55 : 1,
        }}
      >
        {/* Collapse toggle */}
        {node.children.length > 0 ? (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={isCollapsed ? '▸' : '▾'}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#6b7280', padding: 0, fontSize: 12, flexShrink: 0,
            }}
          >
            {isCollapsed ? '▸' : '▾'}
          </button>
        ) : (
          <span style={{ width: 16, flexShrink: 0 }} />
        )}

        {/* Name */}
        <span
          style={{
            flex: 1,
            fontSize: 14,
            color: isProvisional ? '#a78bfa' : '#f1f5f9',
            fontWeight: depth === 0 ? 600 : 400,
            fontStyle: isProvisional ? 'italic' : 'normal',
          }}
        >
          {node.name}
          {node.node_type && (
            <span style={{ marginLeft: 6, fontSize: 11, color: '#4b5563' }}>{node.node_type}</span>
          )}
        </span>

        {/* Saving indicator for provisional nodes */}
        {isProvisional && (
          <span style={{ fontSize: 11, color: '#f59e0b' }}>saving…</span>
        )}

        {/* Avatar stack (passive display) */}
        {!isProvisional && (
          <MemberStack members={node.members} pendingInvites={node.pendingInvites} />
        )}

        {/* + People button (admin only, not for provisional) */}
        {isAdmin && !isProvisional && (
          <button
            type="button"
            onClick={() => setOpenMemberPanelId(isMemberPanelOpen ? null : node.id)}
            style={{
              fontSize: 13,
              color: isMemberPanelOpen ? '#6ee7b7' : '#34d399',
              cursor: 'pointer',
              border: `1px solid ${isMemberPanelOpen ? 'rgba(16,185,129,0.5)' : 'rgba(16,185,129,0.3)'}`,
              padding: '4px 10px',
              borderRadius: 5,
              background: isMemberPanelOpen ? 'rgba(16,185,129,0.2)' : 'rgba(16,185,129,0.1)',
              flexShrink: 0,
              whiteSpace: 'nowrap',
            }}
          >
            {peopleButtonLabel(node.members, node.pendingInvites, isMemberPanelOpen)}
          </button>
        )}

        {/* + Subgroup button (admin only) */}
        {isAdmin && (
          <button
            type="button"
            disabled={isProvisional}
            onClick={() => setOpenChildFormId(isChildFormOpen ? null : node.id)}
            style={{
              fontSize: 13,
              color: isChildFormOpen ? '#a78bfa' : '#818cf8',
              cursor: isProvisional ? 'default' : 'pointer',
              border: `1px solid ${isChildFormOpen ? 'rgba(99,102,241,0.5)' : 'rgba(99,102,241,0.3)'}`,
              padding: '4px 10px',
              borderRadius: 5,
              background: isChildFormOpen ? 'rgba(99,102,241,0.25)' : 'rgba(99,102,241,0.1)',
              opacity: isProvisional ? 0.4 : 1,
              flexShrink: 0,
              whiteSpace: 'nowrap',
            }}
          >
            + Subgroup{isChildFormOpen ? ' ▴' : ''}
          </button>
        )}
      </div>

      {/* Member panel — rendered below the flex row (not inside it) */}
      {isAdmin && isMemberPanelOpen && !isProvisional && (
        <div
          style={{
            paddingTop: 8,
            paddingBottom: 12,
            paddingLeft: paddingLeft + 24,
            paddingRight: 14,
            background: 'rgba(16,185,129,0.03)',
            borderTop: '1px solid rgba(255,255,255,0.04)',
            borderLeft: '2px solid rgba(16,185,129,0.2)',
          }}
        >
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.08em', color: '#6b7280', marginBottom: 8 }}>
            Members
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
            {node.members.map(m => (
              <div
                key={m.user_id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 20, padding: '3px 10px 3px 5px', fontSize: 12, color: '#cbd5e1',
                }}
              >
                <div
                  style={{
                    width: 20, height: 20, borderRadius: '50%',
                    background: avatarColor(m.user_id),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 8, color: '#fff', flexShrink: 0,
                  }}
                >
                  {initials(m.display_name, m.email)}
                </div>
                {m.display_name ?? m.email}
                <RemoveMemberButton nodeId={node.id} orgId={orgId} userId={m.user_id} />
              </div>
            ))}

            {node.pendingInvites.map(invite => (
              <div
                key={invite.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  background: 'rgba(99,102,241,0.08)', border: '1px dashed rgba(99,102,241,0.3)',
                  borderRadius: 20, padding: '3px 10px 3px 8px', fontSize: 12, color: '#a78bfa',
                }}
              >
                {invite.invited_email}
                <span style={{ fontSize: 10, color: '#6366f1', marginLeft: 2 }}>awaiting registration</span>
                <CancelInviteButton invitationId={invite.id} orgId={orgId} />
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 6 }}>
            <AddMemberForm nodeId={node.id} orgId={orgId} />
          </div>
        </div>
      )}

      {/* Inline add-subgroup form */}
      {isChildFormOpen && !isProvisional && (
        <div style={{ paddingLeft: paddingLeft + 18 }}>
          <AddNodeForm
            orgId={orgId}
            parentId={node.id}
            formAction={addNodeFormAction(node.id)}
            onCancel={() => setOpenChildFormId(null)}
          />
        </div>
      )}

      {/* Children */}
      {!isCollapsed && node.children.map(child => renderNode(child, depth + 1))}
    </div>
  )
}
