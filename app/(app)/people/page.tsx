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

  const userManagerId =
    (connections.asDirectReport as EnrichedConnection[])
      .find(c => c.status === 'active')?.manager_id ?? null

  const selectedOrg = orgs[0] ?? null

  const [roundSummaries, nodes, orgRole] = await Promise.all([
    directReportIds.length > 0 ? getDirectReportRoundSummaries(directReportIds, user.id) : Promise.resolve({}),
    selectedOrg ? getNodesForOrg(selectedOrg.id) : Promise.resolve([]),
    selectedOrg ? getOrgRole(user.id, selectedOrg.id) : Promise.resolve(null),
  ])

  return (
    <div style={{ maxWidth: 1180, margin: '0 auto', padding: '24px 28px 40px', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 750, color: 'var(--color-text-primary)', letterSpacing: '-0.02em', margin: '0 0 4px' }}>
          Team &amp; Org
        </h1>
        <p style={{ fontSize: 13.5, color: 'var(--color-text-muted)', margin: '0 0 8px' }}>Your direct reports, your manager, and where you sit in the org.</p>
      </div>

      <YourConnections
        connections={connections as { asManager: EnrichedConnection[]; asDirectReport: EnrichedConnection[] }}
        roundSummaries={roundSummaries}
        userId={user.id}
        pendingInvitations={pendingInvitations}
      />

      <div style={{ margin: '32px 0', borderTop: '1px solid var(--color-border)' }} />

      <OrgSection
        orgs={orgs}
        nodes={nodes}
        orgRole={orgRole}
        currentUserId={user.id}
        userManagerId={userManagerId}
        userDirectReportIds={directReportIds}
      />
    </div>
  )
}
