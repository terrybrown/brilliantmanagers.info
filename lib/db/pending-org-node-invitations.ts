import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function createPendingOrgNodeInvitation(params: {
  inviterId: string
  invitedEmail: string
  orgId: string
  nodeId: string
}): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('pending_org_node_invitations')
    .upsert(
      {
        inviter_id: params.inviterId,
        invited_email: params.invitedEmail.toLowerCase(),
        org_id: params.orgId,
        node_id: params.nodeId,
      },
      { onConflict: 'invited_email,node_id', ignoreDuplicates: true }
    )
  if (error) throw error
}

export async function getPendingOrgNodeInvitationsByEmail(
  email: string
): Promise<Array<{ id: string; org_id: string; node_id: string }>> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('pending_org_node_invitations')
    .select('id, org_id, node_id')
    .eq('invited_email', email)
  if (error) throw error
  return data ?? []
}

export async function deletePendingOrgNodeInvitationsByEmail(email: string): Promise<void> {
  const admin = createAdminClient()
  const { error } = await admin
    .from('pending_org_node_invitations')
    .delete()
    .eq('invited_email', email)
  if (error) throw error
}

export async function deletePendingOrgNodeInvitationById(id: string, orgId: string): Promise<void> {
  const admin = createAdminClient()
  const { error } = await admin
    .from('pending_org_node_invitations')
    .delete()
    .eq('id', id)
    .eq('org_id', orgId)
  if (error) throw error
}

export async function propagateOrgNodeInvitesOnAccept(
  orgMemberId: string,
  newMemberEmail: string
): Promise<void> {
  const admin = createAdminClient()

  const { data: newMemberProfile } = await admin
    .from('profiles')
    .select('id')
    .eq('email', newMemberEmail)
    .maybeSingle()
  const newMemberId = newMemberProfile?.id ?? null

  const { data: nodeMemberships, error: nodesError } = await admin
    .from('org_node_members')
    .select('node_id, org_nodes(org_id)')
    .eq('user_id', orgMemberId)
  if (nodesError) throw nodesError
  if (!nodeMemberships?.length) return

  for (const membership of nodeMemberships) {
    const nodeId = membership.node_id
    const orgId = (membership.org_nodes as unknown as { org_id: string } | null)?.org_id
    if (!orgId) continue

    if (newMemberId) {
      const { data: existing } = await admin
        .from('org_node_members')
        .select('user_id')
        .eq('node_id', nodeId)
        .eq('user_id', newMemberId)
        .maybeSingle()
      if (existing) continue
    }

    const { error: upsertError } = await admin
      .from('pending_org_node_invitations')
      .upsert(
        {
          inviter_id: orgMemberId,
          invited_email: newMemberEmail.toLowerCase(),
          org_id: orgId,
          node_id: nodeId,
        },
        { onConflict: 'invited_email,node_id', ignoreDuplicates: true }
      )
    if (upsertError) throw upsertError
  }
}
