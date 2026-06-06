'use client'
import { useRef, type ReactNode } from 'react'
import { toast } from 'sonner'
import type { OrgNode } from '@/lib/db/org-nodes'
import { MemberStack } from './MemberStack'
import { AddNodeForm } from './AddNodeForm'
import {
  addMemberToNodeAction,
  removeMemberFromNodeAction,
  cancelPendingOrgNodeInvitationAction,
} from '@/app/(app)/organisation/actions'
import { useMutation } from '@/hooks/use-mutation'
import { avatarColor, initials } from './avatar-utils'

export interface OrgNodeWithChildren extends OrgNode {
  children: OrgNodeWithChildren[]
}

// ── Member panel sub-components ───────────────────────────────────────────────

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
      style={{ background: 'none', border: 'none', color: isPending ? 'var(--color-text-faint)' : 'var(--color-text-muted)', cursor: isPending ? 'default' : 'pointer', fontSize: 12, padding: '0 0 0 4px', lineHeight: 1 }}
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
      style={{ background: 'none', border: 'none', color: isPending ? 'var(--color-text-faint)' : 'var(--color-text-muted)', cursor: isPending ? 'default' : 'pointer', fontSize: 12, padding: '0 0 0 4px', lineHeight: 1 }}
    >
      ✕
    </button>
  )
}

function AddMemberForm({ nodeId, orgId }: { nodeId: string; orgId: string }) {
  const formRef = useRef<HTMLFormElement>(null)
  const { mutate, isPending } = useMutation({
    onSuccess: () => {
      formRef.current?.reset()
      toast.success('Member added')
    },
  })
  return (
    <form
      ref={formRef}
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
          flex: 1, background: 'var(--color-surface)', border: '1px solid var(--color-border)',
          color: 'var(--color-text-primary)', padding: '5px 8px', borderRadius: 4, fontSize: 12,
          outline: 'none', maxWidth: 280,
        }}
      />
      <button
        type="submit"
        disabled={isPending}
        style={{
          background: 'var(--color-accent-wash2)', border: '1px solid var(--color-accent-border)',
          color: 'var(--color-accent)', padding: '5px 10px', borderRadius: 4, fontSize: 12,
          cursor: isPending ? 'default' : 'pointer', opacity: isPending ? 0.6 : 1,
        }}
      >
        {isPending ? '…' : 'Add'}
      </button>
    </form>
  )
}

// ── People button label ───────────────────────────────────────────────────────

export function peopleButtonLabel(
  members: OrgNode['members'],
  pendingInvites: OrgNode['pendingInvites'],
  isOpen: boolean
): string {
  const n = members.length
  const p = pendingInvites.length
  const arrow = isOpen ? ' ▴' : n > 0 || p > 0 ? ' ▾' : ''

  if (n === 0 && p === 0) return '+ People'
  const peopleWord = n === 1 ? 'person' : 'people'
  const pendingWord = p === 1 ? 'invite' : 'invites'
  if (n === 0) return `${p} pending ${pendingWord}${arrow}`
  if (p === 0) return `${n} ${peopleWord}${arrow}`
  return `${n} ${peopleWord} · ${p} pending${arrow}`
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
          borderBottom: '1px solid var(--color-border)',
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
              color: 'var(--color-text-faint)', padding: 0, fontSize: 12, flexShrink: 0,
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
            color: isProvisional ? 'var(--color-accent)' : 'var(--color-text-primary)',
            fontWeight: depth === 0 ? 600 : 400,
            fontStyle: isProvisional ? 'italic' : 'normal',
          }}
        >
          {node.name}
          {node.node_type && (
            <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--color-text-faint)' }}>{node.node_type}</span>
          )}
        </span>

        {/* Saving indicator for provisional nodes */}
        {isProvisional && (
          <span style={{ fontSize: 11, color: 'var(--color-accent)' }}>saving…</span>
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
              color: 'var(--color-positive)',
              cursor: 'pointer',
              border: `1px solid ${isMemberPanelOpen ? 'rgba(4,120,87,0.3)' : 'rgba(4,120,87,0.2)'}`,
              padding: '4px 10px',
              borderRadius: 5,
              background: isMemberPanelOpen ? 'rgba(4,120,87,0.1)' : 'rgba(4,120,87,0.05)',
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
              color: 'var(--color-accent)',
              cursor: isProvisional ? 'default' : 'pointer',
              border: `1px solid ${isChildFormOpen ? 'var(--color-accent-border)' : 'var(--color-accent-border)'}`,
              padding: '4px 10px',
              borderRadius: 5,
              background: isChildFormOpen ? 'var(--color-accent-wash)' : 'var(--color-accent-wash2)',
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
            background: 'var(--color-positive-bg)',
            borderTop: '1px solid var(--color-border)',
            borderLeft: '2px solid var(--color-positive-border)',
          }}
        >
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--color-text-faint)', marginBottom: 8 }}>
            Members
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
            {node.members.map(m => (
              <div
                key={m.user_id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  background: 'var(--color-chip-bg)', border: '1px solid var(--color-border)',
                  borderRadius: 20, padding: '3px 10px 3px 5px', fontSize: 12, color: 'var(--color-text-primary)',
                }}
              >
                <div
                  style={{
                    width: 20, height: 20, borderRadius: '50%',
                    background: avatarColor(m.user_id),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 8, color: 'var(--color-accent-fg)', flexShrink: 0,
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
                  background: 'var(--color-accent-wash)', border: '1px dashed var(--color-accent-border)',
                  borderRadius: 20, padding: '3px 10px 3px 8px', fontSize: 12, color: 'var(--color-accent)',
                }}
              >
                {invite.invited_email}
                <span style={{ fontSize: 10, color: 'var(--color-text-muted)', marginLeft: 2 }}>awaiting registration</span>
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
