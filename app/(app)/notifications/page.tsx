import { createClient } from '@/lib/supabase/server'
import { getNotifications } from '@/lib/notifications'
import { NotificationsList } from '@/components/notifications/NotificationsList'

export default async function NotificationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const notifications = await getNotifications(user.id)

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Notifications</h1>
      <NotificationsList notifications={notifications} />
    </div>
  )
}
