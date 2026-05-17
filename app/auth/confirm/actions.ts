'use server'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function confirmLogin(formData: FormData) {
  const code = formData.get('code') as string | null
  if (!code) redirect('/login')

  const supabase = await createClient()
  const {
    data: { user },
    error: exchangeError,
  } = await supabase.auth.exchangeCodeForSession(code)

  if (exchangeError) {
    redirect(
      `/auth/confirm?error=access_denied&error_description=${encodeURIComponent(exchangeError.message)}`
    )
  }

  if (user) {
    await supabase.from('profiles').upsert(
      {
        id: user.id,
        email: user.email,
        display_name: user.email?.split('@')[0] ?? '',
      },
      { onConflict: 'id' }
    )
  }

  redirect('/dashboard')
}
