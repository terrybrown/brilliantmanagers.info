'use client'

import { Button } from '@/components/ui/button'
import { useMutation } from '@/hooks/use-mutation'
import { updateProfileAction } from '@/app/(app)/profile/actions'

interface ProfileFormProps {
  displayName: string
  jobTitle: string
  bio: string
  email: string
}

export function ProfileForm({ displayName, jobTitle, bio, email }: ProfileFormProps) {
  const { mutate, isPending } = useMutation({ onSuccess: 'Profile saved' })

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    mutate(() => updateProfileAction(formData))
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
          Display name
        </label>
        <input
          name="display_name"
          type="text"
          defaultValue={displayName}
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
          defaultValue={jobTitle}
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
          defaultValue={bio}
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
          value={email}
          disabled
          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-500"
        />
      </div>

      <Button type="submit" loading={isPending} className="self-start">
        Save changes
      </Button>
    </form>
  )
}
