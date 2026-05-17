import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getProfile } from '@/lib/db/profiles'
import { updateProfileAction } from './actions'

export default async function ProfilePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const profile = await getProfile(user.id)

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-2 text-2xl font-bold text-white">Profile</h1>
      <p className="mb-8 text-sm text-slate-400">
        Update your display name, job title, and bio.
      </p>

      <form action={updateProfileAction} className="flex flex-col gap-5">
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
            Display name
          </label>
          <input
            name="display_name"
            type="text"
            defaultValue={profile?.display_name ?? ''}
            required
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
            Job title
          </label>
          <input
            name="job_title"
            type="text"
            defaultValue={profile?.job_title ?? ''}
            placeholder="e.g. Engineering Manager"
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
            Bio
          </label>
          <textarea
            name="bio"
            rows={4}
            defaultValue={profile?.bio ?? ''}
            placeholder="A short description about yourself..."
            className="w-full resize-none rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
            Email
          </label>
          <input
            type="email"
            value={user.email ?? ''}
            disabled
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-500"
          />
        </div>

        <button
          type="submit"
          className="self-start rounded-lg bg-amber-500 px-6 py-3 text-sm font-semibold text-white hover:bg-amber-400"
        >
          Save changes
        </button>
      </form>
    </div>
  )
}
