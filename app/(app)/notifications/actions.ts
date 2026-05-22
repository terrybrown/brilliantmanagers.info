'use server'
import { createClient } from '@/lib/supabase/server'
import { markAllRead } from '@/lib/notifications'

export async function markAllReadAction(): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await markAllRead(user.id)
}
