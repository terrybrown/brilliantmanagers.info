import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getSignedAvatarUrl } from '@/lib/db/profiles'
import { isSuperAdmin } from '@/lib/auth/roles'
import { getUnreadCount } from '@/lib/notifications'
import { AppShell } from '@/components/app/AppShell'
import { Toaster } from '@/components/ui/sonner'

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

  const [{ data: profile }, superAdmin, unreadCount] = await Promise.all([
    supabase.from('profiles').select('display_name, avatar_path').eq('id', user.id).maybeSingle(),
    isSuperAdmin(user.id),
    getUnreadCount(user.id),
  ])

  const displayName = profile?.display_name ?? user.email?.split('@')[0] ?? 'You'
  const email = user.email ?? ''
  const initials = getInitials(displayName, email)
  const avatarUrl = profile?.avatar_path
    ? await getSignedAvatarUrl(profile.avatar_path)
    : undefined

  return (
    <>
      <AppShell
        user={{ displayName, email, initials, avatarUrl: avatarUrl ?? undefined }}
        showBeta={true}
        isSuperAdmin={superAdmin}
        unreadCount={unreadCount}
      >
        {children}
      </AppShell>
      <Toaster position="bottom-right" theme="dark" />
    </>
  )
}
