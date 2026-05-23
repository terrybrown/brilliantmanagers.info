import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getProfile, getSignedAvatarUrl } from '@/lib/db/profiles'
import { getConnectionsForUser } from '@/lib/db/connections'
import { AvatarUpload } from '@/components/app/AvatarUpload'
import { BlindScoringToggle } from '@/components/profile/BlindScoringToggle'
import { ProfileForm } from '@/components/profile/ProfileForm'

function getInitials(name: string | null, email: string | null): string {
  const src = name ?? email ?? '?'
  const parts = src.split(/[\s@]/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return src.slice(0, 2).toUpperCase()
}

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [profile, connections] = await Promise.all([
    getProfile(user.id),
    getConnectionsForUser(user.id),
  ])
  const avatarUrl = profile?.avatar_path
    ? await getSignedAvatarUrl(profile.avatar_path)
    : null
  const initials = getInitials(profile?.display_name ?? null, user.email ?? null)
  const hasDirectReports = connections.asManager.some(c => c.status === 'active')

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-2 text-2xl font-bold text-white">Profile</h1>
      <p className="mb-8 text-sm text-slate-400">
        Update your display name, job title, and bio.
      </p>

      <AvatarUpload initialAvatarUrl={avatarUrl} initials={initials} />

      <ProfileForm
        displayName={profile?.display_name ?? ''}
        jobTitle={profile?.job_title ?? ''}
        bio={profile?.bio ?? ''}
        email={user.email ?? ''}
      />

      {hasDirectReports && (
        <section className="mt-8 border-t border-neutral-800 pt-8">
          <h2 className="mb-4 text-lg font-semibold">Manager preferences</h2>
          <BlindScoringToggle initialValue={profile?.manager_scoring_blind ?? false} />
        </section>
      )}
    </div>
  )
}
