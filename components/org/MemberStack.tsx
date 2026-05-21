'use client'
import { useState, useTransition } from 'react'
import {
  addMemberToNodeAction,
  removeMemberFromNodeAction,
  cancelPendingOrgNodeInvitationAction,
} from '@/app/(app)/organisation/actions'
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
  const [memberError, setMemberError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const visible = members.slice(0, MAX_VISIBLE)
  const overflow = members.length - MAX_VISIBLE

  if (members.length === 0 && pendingInvites.length === 0) {
    return (
      <span
        onClick={isAdmin ? onToggle : undefined}
        style={{
          color: '#4b5563',
          fontSize: 11,
          cursor: isAdmin ? 'pointer' : 'default',
        }}
      >
        0 people
      </span>
    )
  }

  return (
    <>
      {/* Avatar stack */}
      <div
        onClick={isAdmin ? onToggle : undefined}
        title={isAdmin ? 'Manage members' : undefined}
        style={{
          display: 'flex',
          cursor: isAdmin ? 'pointer' : 'default',
        }}
      >
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
                <form action={removeMemberFromNodeAction} style={{ display: 'inline' }}>
                  <input type="hidden" name="nodeId" value={nodeId} />
                  <input type="hidden" name="userId" value={m.user_id} />
                  <input type="hidden" name="orgId" value={orgId} />
                  <button type="submit" style={{ background: 'none', border: 'none', color: '#4b5563', cursor: 'pointer', fontSize: 12, padding: '0 0 0 4px', lineHeight: 1 }}>
                    ✕
                  </button>
                </form>
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
                <form action={cancelPendingOrgNodeInvitationAction} style={{ display: 'inline' }}>
                  <input type="hidden" name="orgId" value={orgId} />
                  <input type="hidden" name="invitationId" value={invite.id} />
                  <button type="submit" style={{ background: 'none', border: 'none', color: '#4b5563', cursor: 'pointer', fontSize: 12, padding: '0 0 0 4px', lineHeight: 1 }}>
                    ✕
                  </button>
                </form>
              </div>
            ))}
          </div>

          {/* Add member input */}
          <div style={{ display: 'flex', gap: 6 }}>
            <form
              style={{ display: 'flex', gap: 6, flex: 1 }}
              action={async (fd) => {
                fd.set('orgId', orgId)
                fd.set('nodeId', nodeId)
                setMemberError(null)
                startTransition(async () => {
                  const result = await addMemberToNodeAction(fd)
                  if (result.error) setMemberError(result.error)
                })
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
          </div>
          {memberError && (
            <p style={{ margin: '6px 0 0', fontSize: 11, color: '#ef4444' }}>{memberError}</p>
          )}
        </div>
      )}
    </>
  )
}
