'use client'
import { useEffect, useTransition } from 'react'
import { markAllReadAction } from '@/app/(app)/notifications/actions'
import type { Notification } from '@/lib/notifications'

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function getNotificationHref(n: Notification): string {
  if (n.type === 'manager_scoring_needed' && typeof n.payload.directReportId === 'string') {
    return `/manager/${n.payload.directReportId}`
  }
  const links: Record<string, string> = {
    connection_request_received: '/people',
    connection_accepted: '/people',
    round_scheduled: '/scorecard',
  }
  return links[n.type] ?? '/'
}

const LABELS: Record<string, string> = {
  manager_scoring_needed: 'Ready to score',
  connection_request_received: 'New connection request',
  connection_accepted: 'Connection accepted',
  round_scheduled: 'Round scheduled',
}

export function NotificationsList({ notifications }: { notifications: Notification[] }) {
  const [, startTransition] = useTransition()

  useEffect(() => {
    if (notifications.some(n => !n.readAt)) {
      startTransition(() => { markAllReadAction() })
    }
  }, [notifications])

  if (notifications.length === 0) {
    return <p className="text-sm text-neutral-400">No notifications yet.</p>
  }

  return (
    <ul className="space-y-2">
      {notifications.map(n => (
        <li key={n.id}>
          <a
            href={getNotificationHref(n)}
            className="flex items-start gap-3 rounded-lg border border-neutral-800 p-4 hover:border-neutral-600 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{LABELS[n.type] ?? n.type}</p>
              <p className="text-xs text-neutral-400 mt-0.5">{formatRelativeTime(n.createdAt)}</p>
            </div>
            {!n.readAt && (
              <span className="mt-1 h-2 w-2 rounded-full bg-amber-500 flex-shrink-0" />
            )}
          </a>
        </li>
      ))}
    </ul>
  )
}
