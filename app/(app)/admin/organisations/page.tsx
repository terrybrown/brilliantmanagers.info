import { createAdminClient } from '@/lib/supabase/admin'
import { deleteOrgAction } from './actions'

interface OrgRow {
  id: string
  name: string
  created_at: string
  org_members: {
    role: string
    profiles: { email: string | null; display_name: string | null } | null
  }[]
  org_nodes: { id: string }[]
}

export default async function AdminOrganisationsPage() {
  const supabase = createAdminClient()

  const { data } = await supabase
    .from('organisations')
    .select(
      'id, name, created_at, org_members(role, profiles(email, display_name)), org_nodes(id)'
    )
    .order('created_at', { ascending: false })

  const orgs = (data ?? []) as unknown as OrgRow[]

  // Fetch last activity per org: most recent completed_at among any org member's assessment rounds
  const lastActivityMap: Record<string, string | null> = {}

  await Promise.all(
    orgs.map(async (org) => {
      const { data: memberRows } = await supabase
        .from('org_members')
        .select('user_id')
        .eq('org_id', org.id)

      const userIds = (memberRows ?? []).map((m: { user_id: string }) => m.user_id)
      if (userIds.length === 0) {
        lastActivityMap[org.id] = null
        return
      }

      const { data: roundRows } = await supabase
        .from('assessment_rounds')
        .select('completed_at')
        .in('user_id', userIds)
        .eq('status', 'complete')
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false })
        .limit(1)

      lastActivityMap[org.id] = roundRows?.[0]?.completed_at ?? null
    })
  )

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="mb-6 text-2xl font-bold text-white">Organisations</h1>
      <div className="overflow-hidden rounded-xl" style={{ border: '1px solid #1f2937' }}>
        <table className="w-full text-sm">
          <thead style={{ background: '#111827' }}>
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">Admin(s)</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">Members</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">Nodes</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">Last Activity</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">Created</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody style={{ background: '#0d1117' }}>
            {orgs.map(org => {
              const admins = org.org_members.filter(m => m.role === 'org_admin')
              const lastActivity = lastActivityMap[org.id]
              return (
                <tr key={org.id} style={{ borderTop: '1px solid #1f2937' }}>
                  <td className="px-4 py-3 font-medium text-white">{org.name}</td>
                  <td className="px-4 py-3 text-slate-400">
                    {admins.length > 0
                      ? admins.map(a => a.profiles?.display_name ?? a.profiles?.email ?? '—').join(', ')
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-400">{org.org_members.length}</td>
                  <td className="px-4 py-3 text-slate-400">{org.org_nodes.length}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {lastActivity
                      ? new Date(lastActivity).toLocaleDateString()
                      : <span className="text-slate-600">No activity</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {new Date(org.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <form action={deleteOrgAction}>
                      <input type="hidden" name="orgId" value={org.id} />
                      <button
                        type="submit"
                        className="text-xs text-red-500 underline hover:text-red-400"
                      >
                        Delete
                      </button>
                    </form>
                  </td>
                </tr>
              )
            })}
            {orgs.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                  No organisations yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
