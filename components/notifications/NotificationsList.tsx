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
  const links: Partial<Record<NotificationType, string>> = {
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

const ICON_CONFIG: Record<NotificationType, { icon: React.ReactNode; tint: string; bg: string }> = {
  manager_scoring_needed: {
    icon: <ClipboardCheck size={17} strokeWidth={1.75} style={{ color: 'var(--color-manager)' }} />,
    tint: 'var(--color-manager)',
    bg: 'var(--color-manager-wash)',
  },
  connection_request_received: {
    icon: <UserPlus size={17} strokeWidth={1.75} style={{ color: 'var(--color-accent)' }} />,
    tint: 'var(--color-accent)',
    bg: 'var(--color-accent-wash2)',
  },
  connection_accepted: {
    icon: <UserCheck size={17} strokeWidth={1.75} style={{ color: 'var(--color-positive)' }} />,
    tint: 'var(--color-positive)',
    bg: 'var(--color-positive-bg)',
  },
  round_scheduled: {
    icon: <Calendar size={17} strokeWidth={1.75} style={{ color: 'var(--color-accent)' }} />,
    tint: 'var(--color-accent)',
    bg: 'var(--color-accent-wash2)',
  },
}

export function NotificationsList({ notifications }: { notifications: Notification[] }) {
  const [, startTransition] = useTransition()

  useEffect(() => {
    if (notifications.some(n => !n.readAt)) {
      startTransition(() => { markAllReadAction().catch(console.error) })
    }
  }, [notifications])

  if (notifications.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '32px 0', color: 'var(--color-text-faint)' }}>
        <Bell size={16} strokeWidth={1.75} />
        <p style={{ fontSize: 14, margin: 0 }}>You&apos;re all caught up.</p>
      </div>
    )
  }

  return (
    <div style={{
      background: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius)',
      boxShadow: 'var(--shadow-card)',
      overflow: 'hidden',
    }}>
      {notifications.map((n, i) => {
        const isUnread = !n.readAt
        const cfg = ICON_CONFIG[n.type] ?? { icon: <Bell size={17} />, tint: 'var(--color-text-faint)', bg: 'var(--color-chip-bg)' }
        return (
          <a
            key={n.id}
            href={getNotificationHref(n)}
            data-testid="notification-row"
            data-unread={isUnread ? 'true' : undefined}
            style={{
              display: 'flex',
              gap: 14,
              padding: '15px 18px',
              alignItems: 'flex-start',
              textDecoration: 'none',
              background: isUnread ? 'var(--color-accent-wash)' : 'transparent',
              borderTop: i === 0 ? 'none' : '1px solid var(--color-border)',
              borderLeft: isUnread ? '3px solid var(--color-accent)' : '3px solid transparent',
            }}
          >
            {/* Icon square */}
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 9,
              flexShrink: 0,
              background: cfg.bg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              {cfg.icon}
            </div>
            {/* Content */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{
                fontSize: 13.5,
                fontWeight: 600,
                color: 'var(--color-text-primary)',
                lineHeight: 1.4,
                margin: 0,
              }}>
                {getNotificationDescription(n)}
                {isUnread && (
                  <span style={{
                    display: 'inline-block',
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: 'var(--color-accent)',
                    marginLeft: 7,
                    verticalAlign: 'middle',
                    flexShrink: 0,
                  }} />
                )}
              </p>
            </div>
            {/* Timestamp */}
            <span style={{ fontSize: 11, color: 'var(--color-text-faint)', whiteSpace: 'nowrap', flexShrink: 0 }}>
              {formatRelativeTime(n.createdAt)}
            </span>
          </a>
        )
      })}
    </div>
  )
}
