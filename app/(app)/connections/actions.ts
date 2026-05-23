'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createConnection, acceptConnection, NO_ACCOUNT_ERROR } from '@/lib/db/connections'
import { createPendingInvitation } from '@/lib/db/pending-invitations'
import { propagateOrgNodeInvitesOnAccept } from '@/lib/db/pending-org-node-invitations'
import { logAudit } from '@/lib/audit'
import { sendEmail } from '@/lib/email/mailgun'
import { buildManagerInviteEmail } from '@/lib/email/templates/manager-invite'
import { buildConnectionInviteEmail } from '@/lib/email/templates/connection-invite'
import { createNotification } from '@/lib/notifications'
import { sendConnectionRequestEmail, sendConnectionAcceptedEmail } from '@/lib/email/notifications'
import { ok, err, type ActionResult } from '@/lib/action-result'

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
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return err('Not authenticated')

  const email = formData.get('email') as string
  const role = formData.get('role') as 'manager' | 'direct_report'
  const message = (formData.get('message') as string | null) ?? ''

  const { error, managerId, directReportId } = await createConnection({
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
    if (inviteError) return err(inviteError)

    const fromName = await getDisplayName(supabase, user.id, user.email ?? 'A colleague')

    const { subject, html } = buildConnectionInviteEmail({
      fromName,
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
    return ok()
  }

  if (error) return err(error)

  // Notify the other party that they received a connection request
  const otherUserId = role === 'manager' ? directReportId : managerId
  if (otherUserId) {
    const fromName = await getDisplayName(supabase, user.id, user.email ?? 'A colleague')
    await createNotification(otherUserId, 'connection_request_received', {
      requesterId: user.id,
      requesterName: fromName,
    })
    void sendConnectionRequestEmail(otherUserId, fromName)
  }

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
  return ok()
}

// Returns ActionResult — use in client components with useMutation.
export async function acceptConnectionActionResult(connectionId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return err('Not authenticated')

  try {
    await acceptConnection(connectionId)
  } catch {
    return err('Failed to accept connection.')
  }

  // Fetch the connection to notify the initiator
  const { data: conn } = await supabase
    .from('connections')
    .select('initiated_by')
    .eq('id', connectionId)
    .single()

  if (conn && conn.initiated_by !== user.id) {
    const acceptorName = await getDisplayName(supabase, user.id, user.email ?? 'A colleague')
    await createNotification(conn.initiated_by, 'connection_accepted', {
      acceptorId: user.id,
      acceptorName,
    })
    void sendConnectionAcceptedEmail(conn.initiated_by, acceptorName)
  }

  if (conn && user.email) {
    try {
      await propagateOrgNodeInvitesOnAccept(conn.initiated_by, user.email)
    } catch (e) {
      console.error('org invite propagation failed:', e)
    }
  }

  await logAudit({
    actorId: user.id,
    action: 'connection.accept',
    entityType: 'connection',
    entityId: connectionId,
  })

  revalidatePath('/people')
  return ok()
}
