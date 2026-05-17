import { createClient } from '@/lib/supabase/server'
import { listAllUsersWithRoles } from '@/lib/db/user-roles'
import { grantSuperAdminAction, revokeSuperAdminAction } from './actions'

export default async function AdminUsersPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const users = await listAllUsersWithRoles()

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-6 text-2xl font-bold text-white">Users</h1>
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
                  {u.id !== user!.id && (
                    <form action={u.is_super_admin ? revokeSuperAdminAction : grantSuperAdminAction}>
                      <input type="hidden" name="userId" value={u.id} />
                      <button
                        type="submit"
                        className="text-xs text-slate-400 underline hover:text-white"
                      >
                        {u.is_super_admin ? 'Revoke admin' : 'Grant admin'}
                      </button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
