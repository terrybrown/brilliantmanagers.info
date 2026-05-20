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
