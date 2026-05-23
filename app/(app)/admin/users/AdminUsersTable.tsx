'use client'

import { Button } from '@/components/ui/button'
import { useMutation } from '@/hooks/use-mutation'
import { grantSuperAdminAction, revokeSuperAdminAction } from './actions'

interface User {
  id: string
  display_name: string | null
  email: string | null
  is_super_admin: boolean
  created_at: string
}

interface Props {
  users: User[]
  currentUserId: string
}

function RoleButton({ userId, isSuperAdmin }: { userId: string; isSuperAdmin: boolean }) {
  const action = isSuperAdmin ? revokeSuperAdminAction : grantSuperAdminAction
  const label = isSuperAdmin ? 'Revoke admin' : 'Grant admin'
  const successMsg = isSuperAdmin ? 'Admin role revoked' : 'Admin role granted'
  const { mutate, isPending } = useMutation({ onSuccess: successMsg })

  return (
    <Button
      variant="ghost"
      size="sm"
      loading={isPending}
      onClick={() => {
        const fd = new FormData()
        fd.set('userId', userId)
        mutate(() => action(fd))
      }}
    >
      {label}
    </Button>
  )
}

export function AdminUsersTable({ users, currentUserId }: Props) {
  return (
    <div className="overflow-hidden rounded-xl" style={{ border: '1px solid #1f2937' }}>
      <table className="w-full text-sm">
        <thead style={{ background: '#111827' }}>
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">Name</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">Email</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">Role</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">Joined</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody style={{ background: '#0d1117' }}>
          {users.map(u => (
            <tr key={u.id} style={{ borderTop: '1px solid #1f2937' }}>
              <td className="px-4 py-3 text-white">{u.display_name ?? '—'}</td>
              <td className="px-4 py-3 text-slate-400">{u.email ?? '—'}</td>
              <td className="px-4 py-3">
                {u.is_super_admin ? (
                  <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-semibold text-amber-400">
                    SuperAdmin
                  </span>
                ) : (
                  <span className="text-slate-500">User</span>
                )}
              </td>
              <td className="px-4 py-3 text-slate-500">
                {new Date(u.created_at).toLocaleDateString()}
              </td>
              <td className="px-4 py-3 text-right">
                {u.id !== currentUserId && (
                  <RoleButton userId={u.id} isSuperAdmin={u.is_super_admin} />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
