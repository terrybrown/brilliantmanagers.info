'use client'
import { useEffect, useTransition } from 'react'
import { Bell, UserPlus, UserCheck, Calendar, ClipboardCheck } from 'lucide-react'
import { markAllReadAction } from '@/app/(app)/notifications/actions'
import type { Notification, NotificationType } from '@/lib/notifications'

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function getNotificationHref(n: Notification): string {
  if (n.type === 'manager_scoring_needed') {
    const drId = typeof n.payload.directReportId === 'string' ? n.payload.directReportId : ''
    const roundId = typeof n.payload.roundId === 'string' ? n.payload.roundId : ''
    return roundId ? `/manager/${drId}?roundId=${roundId}` : `/manager/${drId}`
  }
  const links: Record<NotificationType, string> = {
    manager_scoring_needed: '/people',
    connection_request_received: '/people',
    connection_accepted: '/people',
    round_scheduled: '/scorecard',
  }
  return links[n.type] ?? '/'
}

function getNotificationDescription(n: Notification): string {
  const p = n.payload
  switch (n.type) {
    case 'manager_scoring_needed': {
      const name = typeof p.directReportName === 'string' ? p.directReportName : 'Your direct report'
      return `${name} completed their self-assessment. Score them now →`
    }
    case 'connection_request_received': {
      const name = typeof p.requesterName === 'string' ? p.requesterName : 'Someone'
      return `${name} wants to connect on Brilliant Managers`
    }
    case 'connection_accepted': {
      const name = typeof p.acceptorName === 'string' ? p.acceptorName : 'Someone'
      return `${name} accepted your connection request`
    }
    case 'round_scheduled': {
      const date = typeof p.scheduledDate === 'string' ? p.scheduledDate : 'soon'
      return `Your next reflection round is scheduled for ${date}`
    }
    default:
      return 'New notification'
  }
}

const ICONS: Record<NotificationType, React.ReactNode> = {
  manager_scoring_needed: <ClipboardCheck className="h-4 w-4 text-amber-400 flex-shrink-0" />,
  connection_request_received: <UserPlus className="h-4 w-4 text-blue-400 flex-shrink-0" />,
  connection_accepted: <UserCheck className="h-4 w-4 text-green-400 flex-shrink-0" />,
  round_scheduled: <Calendar className="h-4 w-4 text-purple-400 flex-shrink-0" />,
}

export function NotificationsList({ notifications }: { notifications: Notification[] }) {
  const [, startTransition] = useTransition()

  useEffect(() => {
    if (notifications.some(n => !n.readAt)) {
      startTransition(() => { markAllReadAction() })
    }
  }, [notifications])

  if (notifications.length === 0) {
    return (
      <div className="flex items-center gap-2 py-8 text-neutral-500">
        <Bell className="h-4 w-4" />
        <p className="text-sm">You&apos;re all caught up.</p>
      </div>
    )
  }

  return (
    <ul className="space-y-2">
      {notifications.map(n => {
        const isUnread = !n.readAt
        return (
          <li key={n.id}>
            <a
              href={getNotificationHref(n)}
              data-testid="notification-row"
              className={[
                'flex items-start gap-3 rounded-lg border p-4 transition-colors',
                isUnread
                  ? 'border-l-4 border-l-amber-500 border-neutral-800 bg-neutral-800/60 hover:border-neutral-600'
                  : 'border-neutral-800 hover:border-neutral-600',
              ].join(' ')}
            >
              <div className="mt-0.5">{ICONS[n.type] ?? <Bell className="h-4 w-4 flex-shrink-0" />}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-neutral-100">{getNotificationDescription(n)}</p>
                <p className="text-xs text-neutral-500 mt-0.5">{formatRelativeTime(n.createdAt)}</p>
              </div>
              {isUnread && (
                <span className="mt-1.5 h-2 w-2 rounded-full bg-amber-500 flex-shrink-0" />
              )}
            </a>
          </li>
        )
      })}
    </ul>
  )
}
