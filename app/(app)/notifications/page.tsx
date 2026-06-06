import { createClient } from '@/lib/supabase/server'
import { getNotifications } from '@/lib/notifications'
import { NotificationsList } from '@/components/notifications/NotificationsList'
import { markAllReadAction } from './actions'

export default async function NotificationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const notifications = await getNotifications(user.id)
  const unreadCount = notifications.filter(n => !n.readAt).length

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '24px 28px 40px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 24,
          fontWeight: 750,
          color: 'var(--color-text-primary)',
          letterSpacing: '-0.02em',
          margin: 0,
        }}>
          Notifications
        </h1>
        {unreadCount > 0 && (
          <span style={{
            fontSize: 12,
            fontWeight: 700,
            color: 'var(--color-accent-fg)',
            background: 'var(--color-accent)',
            padding: '2px 9px',
            borderRadius: 11,
            whiteSpace: 'nowrap',
          }}>
            {unreadCount} new
          </span>
        )}
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {(['All', 'Unread', 'Mentions'] as const).map((f, i) => (
            <span key={f} style={{
              fontSize: 12,
              fontWeight: 600,
              padding: '5px 12px',
              borderRadius: 8,
              cursor: 'pointer',
              background: i === 0 ? 'var(--color-accent-wash2)' : 'transparent',
              color: i === 0 ? 'var(--color-accent)' : 'var(--color-text-faint)',
              border: `1px solid ${i === 0 ? 'var(--color-accent-border)' : 'var(--color-border)'}`,
            }}>{f}</span>
          ))}
          <form action={async () => { await markAllReadAction() }} style={{ display: 'inline' }}>
            <button
              type="submit"
              style={{
                fontSize: 12, fontWeight: 600, padding: '5px 12px', borderRadius: 8,
                cursor: 'pointer', background: 'transparent',
                color: 'var(--color-text-muted)', border: '1px solid var(--color-border)',
              }}
            >
              ✓ Mark all read
            </button>
          </form>
        </div>
      </div>
      <NotificationsList notifications={notifications} />
    </div>
  )
}
