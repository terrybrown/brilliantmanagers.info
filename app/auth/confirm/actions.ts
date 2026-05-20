'use server'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function confirmLogin(formData: FormData) {
  const tokenHash = formData.get('token_hash') as string | null
  if (!tokenHash) redirect('/login')

  const supabase = await createClient()
  const {
    data: { user },
    error: verifyError,
  } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'email' })

  if (verifyError) {
    redirect(
      `/auth/confirm?error=access_denied&error_description=${encodeURIComponent(verifyError.message)}`
    )
  }

  if (user) {
    await supabase.from('profiles').upsert(
      {
        id: user.id,
        email: user.email,
        display_name: user.email?.split('@')[0] ?? '',
      },
      { onConflict: 'id' }
    )

    if (!user.email) {
      redirect('/dashboard')
    }

    const admin = createAdminClient()
    const { data: invites, error: invitesError } = await admin
      .from('pending_invitations')
      .select('*')
      .eq('invited_email', user.email)

    if (invitesError) {
      console.error('Failed to fetch pending invitations:', invitesError)
    }

    if (invites && invites.length > 0) {
      for (const invite of invites) {
        const managerId =
          invite.inviter_role === 'manager' ? invite.inviter_id : user.id
        const directReportId =
          invite.inviter_role === 'direct_report' ? invite.inviter_id : user.id
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
      await admin
        .from('pending_invitations')
        .delete()
        .eq('invited_email', user.email)
    }

    // Process pending org node invitations
    const { data: nodeInvites, error: nodeInvitesError } = await admin
      .from('pending_org_node_invitations')
      .select('id, org_id, node_id')
      .eq('invited_email', user.email)

    if (nodeInvitesError) {
      console.error('Failed to fetch pending org node invitations:', nodeInvitesError)
    } else if (nodeInvites && nodeInvites.length > 0) {
      for (const invite of nodeInvites as { id: string; org_id: string; node_id: string }[]) {
        const { error: orgErr } = await admin
          .from('org_members')
          .upsert(
            { org_id: invite.org_id, user_id: user.id, role: 'member' },
            { onConflict: 'org_id,user_id', ignoreDuplicates: true }
          )
        if (orgErr) {
          console.error('Failed to add org member on OTP confirm:', orgErr)
          continue
        }

        const { error: nodeErr } = await admin
          .from('org_node_members')
          .insert({ node_id: invite.node_id, user_id: user.id })
        if (nodeErr && nodeErr.code !== '23505') {
          console.error('Failed to add org node member on OTP confirm:', nodeErr)
        }
      }

      await admin
        .from('pending_org_node_invitations')
        .delete()
        .eq('invited_email', user.email)
    }
  }

  redirect('/dashboard')
}
