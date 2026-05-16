import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const betaEmails = process.env.APP_BETA_EMAILS
  if (betaEmails) {
    const allowed = betaEmails.split(',').map(e => e.trim())
    if (!allowed.includes(user.email ?? '')) {
      redirect('/the-tool')
    }
  }

  return <>{children}</>
}
