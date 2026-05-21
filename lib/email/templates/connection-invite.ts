// lib/email/templates/connection-invite.ts
interface ConnectionInviteEmailParams {
  fromName: string
  inviterRole: 'manager' | 'direct_report'
  personalMessage?: string
}

interface EmailContent {
  subject: string
  html: string
}

export function buildConnectionInviteEmail({
  fromName,
  inviterRole,
  personalMessage,
}: ConnectionInviteEmailParams): EmailContent {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://brilliantmanagers.info'
  const loginUrl = `${appUrl}/the-tool`

  const relationshipText =
    inviterRole === 'manager'
      ? 'invited you as one of their direct reports'
      : 'invited you as their manager'

  const messageBlock = personalMessage
    ? `<div class="personal-message"
           style="margin:20px 0;padding:12px 16px;background:#1e2d3d;border-left:3px solid #f59e0b;
                  border-radius:4px;font-style:italic;color:#94a3b8;">
         "${personalMessage}"
       </div>`
    : ''

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0d1117;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:40px auto;padding:0 16px;">
    <div style="background:#111827;border:1px solid #1f2937;border-radius:12px;overflow:hidden;">
      <div style="padding:24px 32px;border-bottom:1px solid #1f2937;">
        <p style="margin:0;font-size:22px;font-weight:700;color:#f1f5f9;">Brilliant Managers</p>
      </div>
      <div style="padding:32px;">
        <p style="margin:0 0 16px;color:#e2e8f0;font-size:16px;">Hi there,</p>
        <p style="margin:0 0 16px;color:#cbd5e1;font-size:15px;line-height:1.6;">
          <strong style="color:#f1f5f9;">${fromName}</strong> has ${relationshipText} on
          Brilliant Managers, a tool for tracking management effectiveness.
        </p>
        ${messageBlock}
        <div style="margin:28px 0;">
          <a href="${loginUrl}"
             style="display:inline-block;padding:12px 24px;background:#4f46e5;color:#fff;
                    font-weight:600;font-size:15px;text-decoration:none;border-radius:8px;">
            Create your account →
          </a>
        </div>
        <p style="margin:0;color:#4b5563;font-size:13px;line-height:1.5;">
          You'll need to create a free account to accept this connection. If you weren't
          expecting this, you can safely ignore it.
        </p>
      </div>
    </div>
  </div>
</body>
</html>`

  return {
    subject: `${fromName} has invited you to join Brilliant Managers`,
    html,
  }
}
