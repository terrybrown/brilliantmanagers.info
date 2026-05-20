import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getConnectionsForUser } from '@/lib/db/connections'
import { getPendingInvitationsForInviter } from '@/lib/db/pending-invitations'
import { getOrgsForUser } from '@/lib/db/organisations'
import { getNodesForOrg } from '@/lib/db/org-nodes'
import { getOrgRole } from '@/lib/auth/roles'
import { getDirectReportRoundSummaries } from '@/lib/db/direct-reports'
import type { EnrichedConnection } from './types'
import { YourConnections } from './YourConnections'
import { OrgSection } from './OrgSection'

export const metadata = { title: 'Team & Org' }

export default async function PeoplePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [connections, orgs, pendingInvitations] = await Promise.all([
    getConnectionsForUser(user.id),
    getOrgsForUser(user.id),
    getPendingInvitationsForInviter(user.id),
  ])

  const directReportIds = (connections.asManager as EnrichedConnection[])
    .filter(c => c.status === 'active')
    .map(c => c.direct_report_id)

  const selectedOrg = orgs[0] ?? null

  const [roundSummaries, nodes, orgRole] = await Promise.all([
    directReportIds.length > 0 ? getDirectReportRoundSummaries(directReportIds) : Promise.resolve({}),
    selectedOrg ? getNodesForOrg(selectedOrg.id) : Promise.resolve([]),
    selectedOrg ? getOrgRole(user.id, selectedOrg.id) : Promise.resolve(null),
  ])

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-8 text-2xl font-bold text-white">Team &amp; Org</h1>

      <YourConnections
        connections={connections as { asManager: EnrichedConnection[]; asDirectReport: EnrichedConnection[] }}
        roundSummaries={roundSummaries}
        userId={user.id}
        pendingInvitations={pendingInvitations}
      />

      <div style={{ margin: '32px 0', borderTop: '1px solid rgba(255,255,255,0.07)' }} />

      <OrgSection
        orgs={orgs}
        nodes={nodes}
        orgRole={orgRole}
      />
    </div>
  )
}
