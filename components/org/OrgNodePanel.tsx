'use client'

import { useState, useTransition } from 'react'
import { X } from 'lucide-react'
import { toast } from 'sonner'
import { useMutation } from '@/hooks/use-mutation'
import { createDirectConnection } from '@/app/(app)/people/actions'
import {
  addMemberToNodeAction,
  removeMemberFromNodeAction,
  cancelPendingOrgNodeInvitationAction,
  createNodeAction,
} from '@/app/(app)/organisation/actions'
import type { OrgNode } from '@/lib/db/org-nodes'

interface Props {
  node: OrgNode
  orgId: string
  orgRole: 'org_admin' | 'member' | null
  currentUserId: string
  userManagerId: string | null
  userDirectReportIds: string[]
  onClose: () => void
}

function Avatar({ name }: { name: string }) {
  const initials = name.split(/[\s@]/).filter(Boolean).map(p => p[0]).join('').slice(0, 2).toUpperCase()
  const colors = ['#0E7C6B', '#CC7A1A', '#3B82F6', '#8B5CF6', '#DC2626', '#047857']
  const color = colors[name.charCodeAt(0) % colors.length]
  return (
    <div style={{
      width: 28, height: 28, borderRadius: '50%', background: color,
      color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 10, fontWeight: 700, flexShrink: 0,
    }}>
      {initials || '?'}
    </div>
  )
}

export function OrgNodePanel({
  node, orgId, orgRole, currentUserId,
  userManagerId, userDirectReportIds, onClose,
}: Props) {
  const isAdmin = orgRole === 'org_admin'
  const [showSubgroupForm, setShowSubgroupForm] = useState(false)
  const [, startTransition] = useTransition()

  const { mutate: addMember, isPending: addingMember } = useMutation({ onSuccess: 'Member added' })
  const { mutate: removeMember } = useMutation({ onSuccess: 'Member removed' })
  const { mutate: cancelInvite } = useMutation({ onSuccess: 'Invite cancelled' })
  const { mutate: directLink } = useMutation({ onSuccess: 'Connected' })

  function handleAddMember(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    fd.set('orgId', orgId)
    fd.set('nodeId', node.id)
    addMember(() => addMemberToNodeAction(fd))
    e.currentTarget.reset()
  }

  function handleCreateSubgroup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    fd.set('orgId', orgId)
    fd.set('parentId', node.id)
    startTransition(async () => {
      const result = await createNodeAction(fd)
      if (!result.ok) toast.error(result.error)
      else setShowSubgroupForm(false)
    })
  }

  return (
    <div
      style={{
        width: 320, flexShrink: 0,
        borderLeft: '1px solid var(--color-border)',
        background: 'var(--color-surface)',
        display: 'flex', flexDirection: 'column',
        overflowY: 'auto',
      }}
    >
      {/* Header */}
      <div style={{ padding: '14px 16px 12px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)' }}>{node.name}</div>
          <div style={{ fontSize: 11, color: 'var(--color-text-faint)', marginTop: 2 }}>
            {node.members.length} member{node.members.length !== 1 ? 's' : ''}
            {node.pendingInvites.length > 0 && ` · ${node.pendingInvites.length} pending`}
          </div>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-faint)', padding: 4 }}>
          <X size={16} />
        </button>
      </div>

      <div style={{ padding: '12px 16px', flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Members */}
        <div>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--color-text-faint)', marginBottom: 8 }}>
            Members
          </div>

          {node.members.length === 0 && (
            <p style={{ fontSize: 12, color: 'var(--color-text-faint)' }}>No members yet.</p>
          )}

          {node.members.map(member => {
            const displayName = member.display_name ?? member.email ?? member.user_id
            const isCurrentUser = member.user_id === currentUserId
            const isMyManager = member.user_id === userManagerId
            const isMyDR = userDirectReportIds.includes(member.user_id)

            return (
              <div key={member.user_id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--color-border)' }}>
                <Avatar name={displayName} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {displayName}{isCurrentUser && ' (you)'}
                  </div>
                  {member.email && member.display_name && (
                    <div style={{ fontSize: 10, color: 'var(--color-text-faint)' }}>{member.email}</div>
                  )}
                </div>

                {!isCurrentUser && (
                  isMyManager ? (
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: 'var(--color-accent-wash2)', color: 'var(--color-accent)', flexShrink: 0 }}>
                      Your manager
                    </span>
                  ) : isMyDR ? (
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: 'var(--color-manager-wash)', color: 'var(--color-manager)', flexShrink: 0 }}>
                      Your DR
                    </span>
                  ) : isAdmin ? (
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                      <button
                        onClick={() => directLink(() => createDirectConnection(member.user_id, 'manager', orgId))}
                        title="Set as your manager"
                        style={{ padding: '2px 7px', fontSize: 10, fontWeight: 600, borderRadius: 4, border: '1px solid var(--color-accent-border)', background: 'var(--color-accent-wash)', color: 'var(--color-accent)', cursor: 'pointer', whiteSpace: 'nowrap' }}
                      >
                        My manager
                      </button>
                      <button
                        onClick={() => directLink(() => createDirectConnection(member.user_id, 'direct_report', orgId))}
                        title="Add as your direct report"
                        style={{ padding: '2px 7px', fontSize: 10, fontWeight: 600, borderRadius: 4, border: '1px solid var(--color-border)', background: 'transparent', color: 'var(--color-text-muted)', cursor: 'pointer', whiteSpace: 'nowrap' }}
                      >
                        Add as DR
                      </button>
                    </div>
                  ) : null
                )}

                {isAdmin && (
                  <button
                    onClick={() => {
                      const fd = new FormData()
                      fd.set('orgId', orgId)
                      fd.set('nodeId', node.id)
                      fd.set('userId', member.user_id)
                      removeMember(() => removeMemberFromNodeAction(fd))
                    }}
                    title="Remove from this group"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-faint)', fontSize: 12, flexShrink: 0, padding: '0 2px' }}
                  >
                    ×
                  </button>
                )}
              </div>
            )
          })}

          {node.pendingInvites.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--color-text-faint)', marginBottom: 6 }}>
                Pending invites
              </div>
              {node.pendingInvites.map(invite => (
                <div key={invite.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0' }}>
                  <div style={{ flex: 1, fontSize: 11, color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {invite.invited_email}
                  </div>
                  {isAdmin && (
                    <button
                      onClick={() => {
                        const fd = new FormData()
                        fd.set('orgId', orgId)
                        fd.set('invitationId', invite.id)
                        cancelInvite(() => cancelPendingOrgNodeInvitationAction(fd))
                      }}
                      style={{ fontSize: 10, color: 'var(--color-negative)', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add person — admin only */}
        {isAdmin && (
          <form onSubmit={handleAddMember} style={{ display: 'flex', gap: 6 }}>
            <input
              name="email"
              type="email"
              required
              placeholder="Add by email…"
              style={{ flex: 1, border: '1px solid var(--color-border)', borderRadius: 6, padding: '5px 10px', fontSize: 12, background: 'var(--color-bg-base)', color: 'var(--color-text-primary)', minWidth: 0 }}
            />
            <button
              type="submit"
              disabled={addingMember}
              style={{ background: 'var(--color-accent)', color: '#fff', border: 'none', borderRadius: 6, padding: '5px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}
            >
              {addingMember ? '…' : '+'}
            </button>
          </form>
        )}

        {/* Add subgroup (admin only) */}
        {isAdmin && (
          showSubgroupForm ? (
            <form onSubmit={handleCreateSubgroup} style={{ display: 'flex', gap: 6 }}>
              <input
                name="name"
                placeholder="Subgroup name…"
                required
                autoFocus
                style={{ flex: 1, border: '1px solid var(--color-accent-border)', borderRadius: 6, padding: '5px 10px', fontSize: 12, background: 'var(--color-surface)', color: 'var(--color-text-primary)', minWidth: 0 }}
              />
              <button type="submit" style={{ background: 'var(--color-accent)', color: '#fff', border: 'none', borderRadius: 6, padding: '5px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>Create</button>
              <button type="button" onClick={() => setShowSubgroupForm(false)} style={{ background: 'none', border: '1px solid var(--color-border)', borderRadius: 6, padding: '5px 9px', fontSize: 12, cursor: 'pointer', color: 'var(--color-text-faint)', flexShrink: 0 }}>✕</button>
            </form>
          ) : (
            <button
              onClick={() => setShowSubgroupForm(true)}
              style={{ width: '100%', padding: 8, background: 'transparent', border: '1.5px dashed var(--color-border)', borderRadius: 7, fontSize: 12, color: 'var(--color-text-faint)', cursor: 'pointer', textAlign: 'center' }}
            >
              + Add subgroup to {node.name}
            </button>
          )
        )}
      </div>
    </div>
  )
}
