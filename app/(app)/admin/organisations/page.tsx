import { createAdminClient } from '@/lib/supabase/admin'
import { AdminOrgsTable } from './AdminOrgsTable'

interface OrgMemberRaw {
  role: string
  user_id: string
}

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

  // Step 1: fetch orgs with members (no profile join — no FK from org_members to profiles)
  const { data: orgsRaw, error } = await supabase
    .from('organisations')
    .select('id, name, created_at, org_members(role, user_id), org_nodes(id)')
    .order('created_at', { ascending: false })

  if (error || !orgsRaw) {
    return (
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-6 text-2xl font-bold text-white">Organisations</h1>
        <p className="text-sm text-red-400">Failed to load organisations.</p>
      </div>
    )
  }

  // Step 2: fetch profiles for all member user IDs
  const allUserIds = [
    ...new Set(
      orgsRaw.flatMap(o =>
        (o.org_members as OrgMemberRaw[]).map(m => m.user_id)
      )
    ),
  ]

  const profilesById: Record<string, { email: string | null; display_name: string | null }> = {}

  if (allUserIds.length > 0) {
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, email, display_name')
      .in('id', allUserIds)
    for (const p of profilesData ?? []) {
      profilesById[p.id] = { email: p.email, display_name: p.display_name }
    }
  }

  // Step 3: merge profiles into the org_members shape AdminOrgsTable expects
  const orgs: OrgRow[] = orgsRaw.map(org => ({
    id: org.id,
    name: org.name,
    created_at: org.created_at,
    org_nodes: org.org_nodes as { id: string }[],
    org_members: (org.org_members as OrgMemberRaw[]).map(m => ({
      role: m.role,
      profiles: profilesById[m.user_id] ?? null,
    })),
  }))

  // Fetch last activity per org
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
