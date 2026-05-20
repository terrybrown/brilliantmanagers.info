// lib/email/templates/org-node-invite.ts
interface OrgNodeInviteEmailParams {
  inviterName: string
  orgName: string
  nodeName: string
}

interface EmailContent {
  subject: string
  html: string
}

function esc(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function buildOrgNodeInviteEmail({
  inviterName,
  orgName,
  nodeName,
}: OrgNodeInviteEmailParams): EmailContent {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://brilliantmanagers.info'
  const signUpUrl = `${appUrl}/login`

  const escapedInviterName = esc(inviterName)
  const escapedOrgName = esc(orgName)
  const escapedNodeName = esc(nodeName)

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
          <strong style="color:#f1f5f9;">${escapedInviterName}</strong> has added you to the
          <strong style="color:#f1f5f9;">${escapedNodeName}</strong> group within
          <strong style="color:#f1f5f9;">${escapedOrgName}</strong> on Brilliant Managers.
        </p>
        <p style="margin:0 0 24px;color:#cbd5e1;font-size:15px;line-height:1.6;">
          When you sign in, you'll be placed there automatically.
        </p>
        <div style="margin:28px 0;">
          <a href="${signUpUrl}"
             style="display:inline-block;padding:12px 24px;background:#4f46e5;color:#fff;
                    font-weight:600;font-size:15px;text-decoration:none;border-radius:8px;">
            Join ${escapedOrgName} →
          </a>
        </div>
        <p style="margin:0;color:#4b5563;font-size:13px;line-height:1.5;">
          If you weren't expecting this, you can safely ignore it.
        </p>
      </div>
    </div>
  </div>
</body>
</html>`

  return {
    subject: `You've been invited to join ${orgName} on Brilliant Managers`,
    html,
  }
}
