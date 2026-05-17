'use server'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function confirmLogin(formData: FormData) {
  const tokenHash = formData.get('token_hash') as string | null
  if (!tokenHash) redirect('/login')

  const supabase = await createClient()
  const {
    data: { user },
    error: verifyError,
  } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'email' })

  if (verifyError) {
    redirect(
      `/auth/confirm?error=access_denied&error_description=${encodeURIComponent(verifyError.message)}`
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
