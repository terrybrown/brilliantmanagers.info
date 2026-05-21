'use server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function processPendingInvites(userId: string, email: string): Promise<void> {
  const admin = createAdminClient()

  const { data: invites, error: invitesError } = await admin
    .from('pending_invitations')
    .select('*')
    .eq('invited_email', email)

  if (invitesError) {
    console.error('Failed to fetch pending invitations:', invitesError)
  }

  if (invites && invites.length > 0) {
    for (const invite of invites) {
      const managerId = invite.inviter_role === 'manager' ? invite.inviter_id : userId
      const directReportId = invite.inviter_role === 'direct_report' ? invite.inviter_id : userId
      const { error } = await admin.from('connections').insert({
        manager_id: managerId,
        direct_report_id: directReportId,
        status: 'active',
        initiated_by: invite.inviter_id,
      })
      if (error && error.code !== '23505') {
        console.error('Failed to activate pending connection:', error)
      }
    }
  }
  if (invites !== null) {
    await admin.from('pending_invitations').delete().eq('invited_email', email)
  }

  const { data: nodeInvites, error: nodeInvitesError } = await admin
    .from('pending_org_node_invitations')
    .select('id, org_id, node_id')
    .eq('invited_email', email)

  if (nodeInvitesError) {
    console.error('Failed to fetch pending org node invitations:', nodeInvitesError)
  } else if (nodeInvites && nodeInvites.length > 0) {
    for (const invite of nodeInvites as { id: string; org_id: string; node_id: string }[]) {
      const { error: orgErr } = await admin
        .from('org_members')
        .upsert(
          { org_id: invite.org_id, user_id: userId, role: 'member' },
          { onConflict: 'org_id,user_id', ignoreDuplicates: true }
        )
      if (orgErr) {
        console.error('Failed to add org member on invite activation:', orgErr)
        continue
      }

      const { error: nodeErr } = await admin
        .from('org_node_members')
        .insert({ node_id: invite.node_id, user_id: userId })
      if (nodeErr && nodeErr.code !== '23505') {
        console.error('Failed to add org node member on invite activation:', nodeErr)
      }
    }

    await admin
      .from('pending_org_node_invitations')
      .delete()
      .eq('invited_email', email)
  }
}
