import { createAdminClient } from '@/lib/supabase/admin'
import { AdminOrgsTable } from './AdminOrgsTable'

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
      <AdminOrgsTable orgs={orgs} lastActivityMap={lastActivityMap} />
    </div>
  )
}
