import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Bell } from 'lucide-react'

export default async function NotificationsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-2 text-2xl font-bold text-white">Notifications</h1>
      <p className="mb-8 text-sm text-slate-400">Stay up to date with activity on your account.</p>

      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <Bell size={32} strokeWidth={1.25} className="text-slate-600" />
        <p className="text-sm text-slate-500">No notifications yet</p>
      </div>
    </div>
  )
}
