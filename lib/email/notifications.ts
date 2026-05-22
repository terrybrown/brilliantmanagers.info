import { getProfile } from '@/lib/db/profiles'
import { sendEmail } from '@/lib/email/mailgun'

export async function sendManagerScoringNeededEmail(
  managerId: string,
  directReportDisplayName: string
): Promise<void> {
  const profile = await getProfile(managerId)
  if (!profile?.email) return
  if (!profile.email_notifications_enabled) return
  await sendEmail({
    to: profile.email,
    subject: `${directReportDisplayName} has completed their self-assessment`,
    html: `<p>Hi ${profile.display_name ?? ''},</p>
<p>${directReportDisplayName} has completed their self-assessment. Head to your <a href="https://brilliantmanagers.info/people">team page</a> to score them.</p>`,
  })
}
