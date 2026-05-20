interface SendEmailParams {
  to: string
  subject: string
  html: string
}

export async function sendEmail({ to, subject, html }: SendEmailParams): Promise<void> {
  const domain = process.env.MAILGUN_DOMAIN
  const baseUrl = process.env.MAILGUN_BASE_URL
  const apiKey = process.env.MAILGUN_API_KEY
  const from = process.env.MAILGUN_FROM_EMAIL ?? `noreply@${domain}`

  if (!domain || !baseUrl || !apiKey) {
    throw new Error('Mailgun configuration missing')
  }

  const body = new URLSearchParams({ from, to, subject, html })

  const response = await fetch(`${baseUrl}/v3/${domain}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`api:${apiKey}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Mailgun error ${response.status}: ${text}`)
  }
}
