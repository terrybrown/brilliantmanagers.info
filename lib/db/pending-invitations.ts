import { createClient } from '@/lib/supabase/server'

export interface PendingInvitation {
  id: string
  inviter_id: string
  invited_email: string
  inviter_role: 'manager' | 'direct_report'
  created_at: string
}

export async function getPendingInvitationsForInviter(inviterId: string): Promise<PendingInvitation[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('pending_invitations')
    .select('*')
    .eq('inviter_id', inviterId)
  if (error) {
    console.error('getPendingInvitationsForInviter error:', error)
    return []
  }
  return data as PendingInvitation[]
}

export async function createPendingInvitation(params: {
  inviterId: string
  invitedEmail: string
  inviterRole: 'manager' | 'direct_report'
}): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.from('pending_invitations').insert({
    inviter_id: params.inviterId,
    invited_email: params.invitedEmail,
    inviter_role: params.inviterRole,
  })
  if (error) {
    if (error.code === '23505') return { error: 'You have already invited this person.' }
    return { error: error.message }
  }
  return {}
}
