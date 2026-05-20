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

    const admin = createAdminClient()
    const { data: invites } = await admin
      .from('pending_invitations')
      .select('*')
      .eq('invited_email', user.email)

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
      await admin
        .from('pending_invitations')
        .delete()
        .eq('invited_email', user.email)
    }
  }

  redirect('/dashboard')
}
