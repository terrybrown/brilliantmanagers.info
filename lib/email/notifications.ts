import { getProfile } from '@/lib/db/profiles'
import { sendEmail } from '@/lib/email/mailgun'

export async function sendManagerScoringNeededEmail(
  managerId: string,
  directReportDisplayName: string
): Promise<void> {
  const profile = await getProfile(managerId)
  if (!profile?.email) return
  // false = explicitly opted out; true = opted in (DB default)
  if (!profile.email_notifications_enabled) return
  try {
    await sendEmail({
      to: profile.email,
      subject: `${directReportDisplayName} has completed their self-assessment`,
      html: `<p>Hi ${profile.display_name ?? ''},</p>
<p>${directReportDisplayName} has completed their self-assessment. Head to your <a href="https://brilliantmanagers.info/people">team page</a> to score them.</p>`,
    })
  } catch (e) {
    console.error('Failed to send manager scoring needed email:', e)
  }
}

export async function sendConnectionRequestEmail(
  recipientId: string,
  fromName: string
): Promise<void> {
  const profile = await getProfile(recipientId)
  if (!profile?.email) return
  // false = explicitly opted out; true = opted in (DB default)
  if (!profile.email_notifications_enabled) return
  try {
    await sendEmail({
      to: profile.email,
      subject: `${fromName} wants to connect on Brilliant Managers`,
      html: `<p>Hi ${profile.display_name ?? ''},</p>
<p>${fromName} has sent you a connection request on Brilliant Managers. <a href="https://brilliantmanagers.info/people">Log in to accept or decline.</a></p>`,
    })
  } catch (e) {
    console.error('Failed to send connection request email:', e)
  }
}

export async function sendConnectionAcceptedEmail(
  recipientId: string,
  byName: string
): Promise<void> {
  const profile = await getProfile(recipientId)
  if (!profile?.email) return
  // false = explicitly opted out; true = opted in (DB default)
  if (!profile.email_notifications_enabled) return
  try {
    await sendEmail({
      to: profile.email,
      subject: `${byName} accepted your connection request`,
      html: `<p>Hi ${profile.display_name ?? ''},</p>
<p>${byName} accepted your connection request on Brilliant Managers. <a href="https://brilliantmanagers.info/people">View your connections.</a></p>`,
    })
  } catch (e) {
    console.error('Failed to send connection accepted email:', e)
  }
}

export async function sendRoundScheduledEmail(
  recipientId: string,
  scheduledDate: string
): Promise<void> {
  const profile = await getProfile(recipientId)
  if (!profile?.email) return
  // false = explicitly opted out; true = opted in (DB default)
  if (!profile.email_notifications_enabled) return
  try {
    await sendEmail({
      to: profile.email,
      subject: `Your next reflection round is scheduled for ${scheduledDate}`,
      html: `<p>Hi ${profile.display_name ?? ''},</p>
<p>Your next reflection round is scheduled for ${scheduledDate}. <a href="https://brilliantmanagers.info/scorecard">Head to your scorecard when you're ready.</a></p>`,
    })
  } catch (e) {
    console.error('Failed to send round scheduled email:', e)
  }
}
