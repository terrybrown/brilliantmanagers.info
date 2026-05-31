'use client'
import type { OrgNode } from '@/lib/db/org-nodes'
import { avatarColor, initials } from './avatar-utils'

const AVATAR_SIZE = 22
const AVATAR_BORDER = 2
const MAX_VISIBLE = 3

interface MemberStackProps {
  members: OrgNode['members']
  pendingInvites: OrgNode['pendingInvites']
}

export function MemberStack({ members, pendingInvites }: MemberStackProps) {
  if (members.length === 0 && pendingInvites.length === 0) return null

  const visible = members.slice(0, MAX_VISIBLE)
  const overflow = members.length - MAX_VISIBLE

  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
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
  )
}
