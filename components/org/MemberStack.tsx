'use client'
import {
  addMemberToNodeAction,
  removeMemberFromNodeAction,
  cancelPendingOrgNodeInvitationAction,
} from '@/app/(app)/organisation/actions'
import { useMutation } from '@/hooks/use-mutation'
import type { OrgNode } from '@/lib/db/org-nodes'

const AVATAR_COLORS = [
  '#4f46e5', '#0891b2', '#059669', '#7c3aed',
  '#b45309', '#be185d', '#0e7490', '#15803d',
]

function avatarColor(id: string): string {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}

function initials(name: string | null, email: string | null): string {
  const src = name ?? email ?? '?'
  return src.slice(0, 2).toUpperCase()
}

const AVATAR_SIZE = 22
const AVATAR_BORDER = 2
const MAX_VISIBLE = 3

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

interface AddMemberFormProps { nodeId: string; orgId: string }
function AddMemberForm({ nodeId, orgId }: AddMemberFormProps) {
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
          color: '#f1f5f9', padding: '5px 8px', borderRadius: 4, fontSize: 11,
          outline: 'none', maxWidth: 280,
        }}
      />
      <button
        type="submit"
        disabled={isPending}
        style={{
          background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.3)',
          color: '#a78bfa', padding: '5px 10px', borderRadius: 4, fontSize: 11,
          cursor: isPending ? 'default' : 'pointer', opacity: isPending ? 0.6 : 1,
        }}
      >
        {isPending ? '…' : 'Add'}
      </button>
    </form>
  )
}

interface MemberStackProps {
  members: OrgNode['members']
  pendingInvites: OrgNode['pendingInvites']
  nodeId: string
  orgId: string
  isAdmin: boolean
  isOpen: boolean
  onToggle: () => void
}

export function MemberStack({
  members,
  pendingInvites,
  nodeId,
  orgId,
  isAdmin,
  isOpen,
  onToggle,
}: MemberStackProps) {
  const isEmpty = members.length === 0 && pendingInvites.length === 0
  const visible = members.slice(0, MAX_VISIBLE)
  const overflow = members.length - MAX_VISIBLE

  return (
    <>
      {/* Avatar stack / empty trigger */}
      <div
        onClick={isAdmin ? onToggle : undefined}
        title={isAdmin ? 'Manage members' : undefined}
        style={{
          display: 'flex',
          alignItems: 'center',
          cursor: isAdmin ? 'pointer' : 'default',
        }}
      >
        {isEmpty ? (
          <span style={{ color: '#4b5563', fontSize: 11 }}>0 people</span>
        ) : (
          <>
            {visible.map((m, i) => (
              <div
                key={m.user_id}
                style={{
                  width: AVATAR_SIZE,
                  height: AVATAR_SIZE,
                  borderRadius: '50%',
                  background: avatarColor(m.user_id),
                  border: `${AVATAR_BORDER}px solid #111827`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 8,
                  color: '#fff',
                  marginLeft: i > 0 ? -6 : 0,
                  flexShrink: 0,
                }}
              >
                {initials(m.display_name, m.email)}
              </div>
            ))}
            {overflow > 0 && (
              <div
                style={{
                  width: AVATAR_SIZE,
                  height: AVATAR_SIZE,
                  borderRadius: '50%',
                  background: '#374151',
                  border: `${AVATAR_BORDER}px solid #111827`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 8,
                  color: '#9ca3af',
                  marginLeft: -6,
                  flexShrink: 0,
                }}
              >
                +{overflow}
              </div>
            )}
            {pendingInvites.length > 0 && (
              <div
                style={{
                  width: AVATAR_SIZE,
                  height: AVATAR_SIZE,
                  borderRadius: '50%',
                  background: 'rgba(99,102,241,0.2)',
                  border: `${AVATAR_BORDER}px solid rgba(99,102,241,0.4)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 8,
                  color: '#a78bfa',
                  flexShrink: 0,
                }}
              >
                {pendingInvites.length}
              </div>
            )}
          </>
        )}
      </div>

      {/* Member panel — admin only, when open */}
      {isAdmin && isOpen && (
        <div
          style={{
            gridColumn: '1 / -1',
            paddingTop: 8,
            paddingBottom: 12,
            paddingLeft: 38,
            paddingRight: 14,
            background: 'rgba(99,102,241,0.04)',
            borderTop: '1px solid rgba(255,255,255,0.04)',
            borderLeft: '2px solid rgba(99,102,241,0.25)',
          }}
        >
          <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.08em', color: '#6b7280', marginBottom: 8 }}>
            Members
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
            {/* Confirmed member chips */}
            {members.map(m => (
              <div
                key={m.user_id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 20, padding: '3px 10px 3px 5px', fontSize: 11, color: '#cbd5e1',
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
                <RemoveMemberButton nodeId={nodeId} orgId={orgId} userId={m.user_id} />
              </div>
            ))}

            {/* Pending invite chips */}
            {pendingInvites.map(invite => (
              <div
                key={invite.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  background: 'rgba(99,102,241,0.08)', border: '1px dashed rgba(99,102,241,0.3)',
                  borderRadius: 20, padding: '3px 10px 3px 8px', fontSize: 11, color: '#a78bfa',
                }}
              >
                {invite.invited_email}
                <span style={{ fontSize: 9, color: '#6366f1', marginLeft: 2 }}>awaiting registration</span>
                <CancelInviteButton invitationId={invite.id} orgId={orgId} />
              </div>
            ))}
          </div>

          {/* Add member input */}
          <div style={{ display: 'flex', gap: 6 }}>
            <AddMemberForm nodeId={nodeId} orgId={orgId} />
          </div>
        </div>
      )}
    </>
  )
}
