import { createClient } from '@/lib/supabase/server'

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
  if (error) return { error: error.message }
  return {}
}
