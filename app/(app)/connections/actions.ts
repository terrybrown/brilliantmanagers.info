'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createConnection, acceptConnection, NO_ACCOUNT_ERROR } from '@/lib/db/connections'
import { createPendingInvitation } from '@/lib/db/pending-invitations'
import { logAudit } from '@/lib/audit'
import { sendEmail } from '@/lib/email/mailgun'
import { buildManagerInviteEmail } from '@/lib/email/templates/manager-invite'
import { buildConnectionInviteEmail } from '@/lib/email/templates/connection-invite'

export type InviteState = { success: boolean; error?: string }

async function getDisplayName(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  fallback: string
): Promise<string> {
  const { data } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', userId)
    .single()
  return data?.display_name ?? fallback
}

export async function inviteConnection(
  _prevState: InviteState,
  formData: FormData
): Promise<InviteState> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const email = formData.get('email') as string
  const role = formData.get('role') as 'manager' | 'direct_report'
  const message = (formData.get('message') as string | null) ?? ''

  const { error } = await createConnection({
    initiatorId: user.id,
    otherEmail: email,
    initiatorRole: role,
  })

  if (error === NO_ACCOUNT_ERROR) {
    const { error: inviteError } = await createPendingInvitation({
      inviterId: user.id,
      invitedEmail: email,
      inviterRole: role,
    })
    if (inviteError) return { success: false, error: inviteError }

    const fromName = await getDisplayName(supabase, user.id, user.email ?? 'A colleague')

    const { subject, html } = buildConnectionInviteEmail({
      fromName,
      toEmail: email,
      inviterRole: role,
      personalMessage: message || undefined,
    })
    try {
      await sendEmail({ to: email, subject, html })
    } catch (e) {
      console.error('Connection invite email failed:', e)
    }

    await logAudit({
      actorId: user.id,
      action: 'connection.invite_pending',
      entityType: 'pending_invitation',
      metadata: { otherEmail: email, inviterRole: role },
    })

    revalidatePath('/people')
    return { success: true }
  }

  if (error) return { success: false, error }

  await logAudit({
    actorId: user.id,
    action: 'connection.create',
    entityType: 'connection',
    metadata: { otherEmail: email, initiatorRole: role },
  })

  if (role === 'direct_report') {
    const fromName = await getDisplayName(supabase, user.id, user.email ?? 'A colleague')
    const { subject, html } = buildManagerInviteEmail({
      fromName,
      toEmail: email,
      personalMessage: message || undefined,
    })
    try {
      await sendEmail({ to: email, subject, html })
    } catch (e) {
      console.error('Manager invite email failed:', e)
    }
  }

  revalidatePath('/people')
  return { success: true }
}

export async function acceptConnectionAction(connectionId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  await acceptConnection(connectionId)

  await logAudit({
    actorId: user.id,
    action: 'connection.accept',
    entityType: 'connection',
    entityId: connectionId,
  })

  revalidatePath('/people')
}
