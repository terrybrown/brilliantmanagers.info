'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { updateProfile } from '@/lib/db/profiles'
import { logAudit } from '@/lib/audit'
import { ok, err, type ActionResult } from '@/lib/action-result'

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const EXT_MAP: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}
const MAX_BYTES = 2 * 1024 * 1024

export async function updateProfileAction(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return err('Not authenticated')

  const display_name = (formData.get('display_name') as string).trim()
  const job_title = (formData.get('job_title') as string).trim()
  const bio = (formData.get('bio') as string).trim()

  try {
    await updateProfile(user.id, { display_name, job_title, bio })
  } catch {
    return err('Failed to save profile. Please try again.')
  }
  await logAudit({
    actorId: user.id,
    action: 'profile.update',
    entityType: 'profile',
    entityId: user.id,
  })
  revalidatePath('/profile')
  return ok()
}

export async function uploadAvatarAction(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return err('Not authenticated')

  const avatarFile = formData.get('avatar') as File | null
  if (!avatarFile || avatarFile.size === 0) return err('No file selected.')
  if (!ALLOWED_MIME_TYPES.has(avatarFile.type)) return err('Avatar must be a JPEG, PNG, or WebP image.')
  if (avatarFile.size > MAX_BYTES) return err('Avatar must be 2 MB or smaller.')

  const ext = EXT_MAP[avatarFile.type]
  const path = `${user.id}/avatar.${ext}`
  const bytes = new Uint8Array(await avatarFile.arrayBuffer())

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, bytes, { contentType: avatarFile.type, upsert: true })
  if (uploadError) return err(uploadError.message)

  try {
    await updateProfile(user.id, { avatar_path: path })
  } catch {
    return err('Failed to save avatar path. Please try again.')
  }
  revalidatePath('/profile')
  return ok()
}

export async function removeAvatarAction(): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return err('Not authenticated')

  const paths = ['jpg', 'png', 'webp'].map(ext => `${user.id}/avatar.${ext}`)
  const { error: storageError } = await supabase.storage.from('avatars').remove(paths)
  if (storageError) {
    console.error('removeAvatarAction storage error:', storageError)
    return err(storageError.message)
  }

  try {
    await updateProfile(user.id, { avatar_path: null })
  } catch {
    return err('Failed to clear avatar. Please try again.')
  }
  revalidatePath('/profile')
  return ok()
}

export async function updateBlindScoringAction(value: boolean): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return err('Not authenticated')

  try {
    await updateProfile(user.id, { manager_scoring_blind: value })
  } catch {
    return err('Failed to update preference.')
  }
  await logAudit({
    actorId: user.id,
    action: 'profile.update_blind_scoring',
    entityType: 'profile',
    entityId: user.id,
    metadata: { manager_scoring_blind: value },
  })
  revalidatePath('/profile')
  return ok()
}
