'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { updateProfile } from '@/lib/db/profiles'

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const EXT_MAP: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}
const MAX_BYTES = 2 * 1024 * 1024 // 2 MB

export async function updateProfileAction(formData: FormData): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const display_name = (formData.get('display_name') as string).trim()
  const job_title = (formData.get('job_title') as string).trim()
  const bio = (formData.get('bio') as string).trim()

  await updateProfile(user.id, { display_name, job_title, bio })
  revalidatePath('/profile')
}

export async function uploadAvatarAction(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const avatarFile = formData.get('avatar') as File | null
  if (!avatarFile || avatarFile.size === 0) return { error: 'No file selected.' }

  if (!ALLOWED_MIME_TYPES.has(avatarFile.type)) {
    return { error: 'Avatar must be a JPEG, PNG, or WebP image.' }
  }
  if (avatarFile.size > MAX_BYTES) {
    return { error: 'Avatar must be 2 MB or smaller.' }
  }

  const ext = EXT_MAP[avatarFile.type]
  const path = `${user.id}/avatar.${ext}`
  const bytes = new Uint8Array(await avatarFile.arrayBuffer())

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, bytes, { contentType: avatarFile.type, upsert: true })

  if (uploadError) return { error: uploadError.message }

  await updateProfile(user.id, { avatar_path: path })
  revalidatePath('/profile')
  return {}
}

export async function removeAvatarAction(): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('avatar_path')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.avatar_path) {
    await supabase.storage.from('avatars').remove([profile.avatar_path])
    await updateProfile(user.id, { avatar_path: null })
  }

  revalidatePath('/profile')
}
