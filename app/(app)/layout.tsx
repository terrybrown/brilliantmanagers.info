import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getSignedAvatarUrl } from '@/lib/db/profiles'
import { isSuperAdmin } from '@/lib/auth/roles'
import { generateFeaturebaseJwt } from '@/lib/featurebase'
import { AppShell } from '@/components/app/AppShell'

function getInitials(displayName: string | null, email: string | null): string {
  const name = displayName ?? email ?? '?'
  const parts = name.split(/[\s@]/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const [{ data: profile }, superAdmin] = await Promise.all([
    supabase.from('profiles').select('display_name, avatar_path').eq('id', user.id).maybeSingle(),
    isSuperAdmin(user.id),
  ])

  const displayName = profile?.display_name ?? user.email?.split('@')[0] ?? 'You'
  const email = user.email ?? ''
  const initials = getInitials(displayName, email)
  const avatarUrl = profile?.avatar_path
    ? await getSignedAvatarUrl(profile.avatar_path)
    : undefined

  const featurebaseJwt = generateFeaturebaseJwt({ id: user.id, email, displayName })

  return (
    <AppShell
      user={{ displayName, email, initials, avatarUrl: avatarUrl ?? undefined }}
      showBeta={true}
      isSuperAdmin={superAdmin}
      featurebaseJwt={featurebaseJwt}
    >
      {children}
    </AppShell>
  )
}
