import { createClient } from '@/lib/supabase/server'

export interface Profile {
  id: string
  display_name: string | null
  email: string | null
  job_title: string | null
  bio: string | null
  created_at: string
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()
  return data as Profile | null
}

export async function updateProfile(
  userId: string,
  fields: { display_name?: string; job_title?: string; bio?: string }
): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('profiles')
    .update(fields)
    .eq('id', userId)
  if (error) throw error
}
