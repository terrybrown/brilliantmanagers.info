import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export type NotificationType =
  | 'manager_scoring_needed'
  | 'connection_request_received'
  | 'connection_accepted'
  | 'round_scheduled'

export interface Notification {
  id: string
  userId: string
  type: NotificationType
  payload: Record<string, unknown>
  readAt: string | null
  createdAt: string
}

const VALID_NOTIFICATION_TYPES = new Set<string>([
  'manager_scoring_needed',
  'connection_request_received',
  'connection_accepted',
  'round_scheduled',
])

export async function createNotification(
  userId: string,
  type: NotificationType,
  payload: Record<string, unknown> = {}
): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase.from('notifications').insert({ user_id: userId, type, payload })
  if (error) throw error
}

export async function getNotifications(userId: string): Promise<Notification[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) throw error
  return (data ?? [])
    .filter(row => VALID_NOTIFICATION_TYPES.has(row.type))
    .map(row => ({
      id: row.id,
      userId: row.user_id,
      type: row.type as NotificationType, // safe after Set filter
      payload: row.payload as Record<string, unknown>, // JSONB column — DB guarantees object shape
      readAt: row.read_at,
      createdAt: row.created_at,
    }))
}

export async function markAllRead(userId: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('read_at', null)
  if (error) throw error
}

export async function getUnreadCount(userId: string): Promise<number> {
  const supabase = await createClient()
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('read_at', null)
  if (error) throw error
  return count ?? 0
}
