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

function getNotificationCta(n: Notification): { label: string; href: string } | null {
  switch (n.type) {
    case 'manager_scoring_needed':
      return { label: 'Score now →', href: getNotificationHref(n) }
    case 'connection_request_received':
    case 'connection_accepted':
      return { label: 'View team →', href: '/people' }
    case 'round_scheduled':
      return { label: 'Start round →', href: '/scorecard' }
    default:
      return null
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

// ── Mock data for empty state ──────────────────────────────────────────────────

interface MockNotificationItem {
  id: string
  type: string
  title: string
  body: string
  cta: { label: string; href: string } | null
  time: string
  unread: boolean
}

const MOCK_GROUPS: { label: string; items: MockNotificationItem[] }[] = [
  {
    label: 'Today',
    items: [
      { id: 'm1', type: 'manager_scoring_needed', title: 'Priya Anand completed her Q2 reflection', body: 'Her self-assessment is ready for you to score.', cta: { label: 'Score now', href: '/people' }, time: '2h ago', unread: true },
      { id: 'm2', type: 'alert', title: 'Check-in overdue: One-to-Ones', body: 'Your goal check-in was due 3 days ago.', cta: { label: 'Log progress', href: '/growth' }, time: '5h ago', unread: true },
    ],
  },
  {
    label: 'This week',
    items: [
      { id: 'm3', type: 'round_scheduled', title: 'Dana Reyes scored your Q2 reflection', body: 'Your manager rated you across all five pillars.', cta: { label: 'View scores', href: '/reflections' }, time: 'Mon', unread: true },
      { id: 'm4', type: 'goal', title: 'Goal check-in coming up', body: '4 of your active goals have check-ins due in 13 days.', cta: null, time: 'Mon', unread: false },
      { id: 'm5', type: 'round_scheduled', title: 'Q3 2026 round is now open', body: "Start your next self-assessment whenever you're ready.", cta: { label: 'Start round', href: '/scorecard' }, time: 'Sun', unread: false },
    ],
  },
  {
    label: 'Earlier',
    items: [
      { id: 'm6', type: 'connection_accepted', title: 'Tom Becker accepted your connection', body: "You can now see and score Tom's reflections.", cta: null, time: 'Last week', unread: false },
      { id: 'm7', type: 'complete', title: 'You completed your Q2 reflection', body: 'Overall score 3.3 — up 0.8 from last round.', cta: null, time: 'May 28', unread: false },
    ],
  },
]

const MOCK_ICON_CONFIG: Record<string, { icon: React.ReactNode; bg: string }> = {
  manager_scoring_needed: {
    icon: <ClipboardCheck size={17} strokeWidth={1.75} style={{ color: 'var(--color-manager)' }} />,
    bg: 'var(--color-manager-wash)',
  },
  round_scheduled: {
    icon: <Calendar size={17} strokeWidth={1.75} style={{ color: 'var(--color-accent)' }} />,
    bg: 'var(--color-accent-wash2)',
  },
  complete: {
    icon: <Calendar size={17} strokeWidth={1.75} style={{ color: 'var(--color-accent)' }} />,
    bg: 'var(--color-accent-wash2)',
  },
  alert: {
    icon: <Bell size={17} strokeWidth={1.75} style={{ color: 'var(--color-alert-fg)' }} />,
    bg: 'var(--color-alert-bg)',
  },
  connection_accepted: {
    icon: <UserCheck size={17} strokeWidth={1.75} style={{ color: 'var(--color-positive)' }} />,
    bg: 'var(--color-positive-bg)',
  },
  goal: {
    icon: <Bell size={17} strokeWidth={1.75} style={{ color: 'var(--color-text-faint)' }} />,
    bg: 'var(--color-chip-bg)',
  },
}

// ── Date bucketing ─────────────────────────────────────────────────────────────

function bucketNotifications(notifications: Notification[]): { label: string; items: Notification[] }[] {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const weekStart = todayStart - 6 * 24 * 60 * 60 * 1000

  const today: Notification[] = []
  const thisWeek: Notification[] = []
  const earlier: Notification[] = []

  for (const n of notifications) {
    const t = new Date(n.createdAt).getTime()
    if (t >= todayStart) {
      today.push(n)
    } else if (t >= weekStart) {
      thisWeek.push(n)
    } else {
      earlier.push(n)
    }
  }

  const groups: { label: string; items: Notification[] }[] = []
  if (today.length > 0) groups.push({ label: 'Today', items: today })
  if (thisWeek.length > 0) groups.push({ label: 'This week', items: thisWeek })
  if (earlier.length > 0) groups.push({ label: 'Earlier', items: earlier })
  return groups
}

// ── Real notification row ──────────────────────────────────────────────────────

function RealNotificationRow({ n, isFirst }: { n: Notification; isFirst: boolean }) {
  const isUnread = !n.readAt
  const cfg = ICON_CONFIG[n.type] ?? { icon: <Bell size={17} />, tint: 'var(--color-text-faint)', bg: 'var(--color-chip-bg)' }
  const cta = getNotificationCta(n)
  return (
    <a
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
        borderTop: isFirst ? 'none' : '1px solid var(--color-border)',
        borderLeft: isUnread ? '3px solid var(--color-accent)' : '3px solid transparent',
      }}
    >
      <div style={{
        width: 36, height: 36, borderRadius: 9, flexShrink: 0,
        background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {cfg.icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--color-text-primary)', lineHeight: 1.4, margin: 0 }}>
          {getNotificationDescription(n)}
          {isUnread && (
            <span style={{
              display: 'inline-block', width: 7, height: 7, borderRadius: '50%',
              background: 'var(--color-accent)', marginLeft: 7, verticalAlign: 'middle', flexShrink: 0,
            }} />
          )}
        </p>
        {cta && (
          <span style={{ fontSize: 12, color: 'var(--color-accent)', fontWeight: 600, marginTop: 4, display: 'inline-block' }}>
            {cta.label}
          </span>
        )}
      </div>
      <span style={{ fontSize: 11, color: 'var(--color-text-faint)', whiteSpace: 'nowrap', flexShrink: 0 }}>
        {formatRelativeTime(n.createdAt)}
      </span>
    </a>
  )
}

// ── Mock notification row ──────────────────────────────────────────────────────

function MockNotificationRow({ item, isFirst }: { item: MockNotificationItem; isFirst: boolean }) {
  const cfg = MOCK_ICON_CONFIG[item.type] ?? { icon: <Bell size={17} />, bg: 'var(--color-chip-bg)' }
  return (
    <a
      href={item.cta?.href ?? '#'}
      style={{
        display: 'flex',
        gap: 14,
        padding: '15px 18px',
        alignItems: 'flex-start',
        textDecoration: 'none',
        background: item.unread ? 'var(--color-accent-wash)' : 'transparent',
        borderTop: isFirst ? 'none' : '1px solid var(--color-border)',
        borderLeft: item.unread ? '3px solid var(--color-accent)' : '3px solid transparent',
      }}
    >
      <div style={{
        width: 36, height: 36, borderRadius: 9, flexShrink: 0,
        background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {cfg.icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--color-text-primary)', lineHeight: 1.4, margin: 0 }}>
          {item.title}
          {item.unread && (
            <span style={{
              display: 'inline-block', width: 7, height: 7, borderRadius: '50%',
              background: 'var(--color-accent)', marginLeft: 7, verticalAlign: 'middle', flexShrink: 0,
            }} />
          )}
        </p>
        <p style={{ fontSize: 12.5, color: 'var(--color-text-muted)', margin: '3px 0 0', lineHeight: 1.4 }}>
          {item.body}
        </p>
        {item.cta && (
          <span style={{ fontSize: 12, color: 'var(--color-accent)', fontWeight: 600, marginTop: 4, display: 'inline-block' }}>
            {item.cta.label} →
          </span>
        )}
      </div>
      <span style={{ fontSize: 11, color: 'var(--color-text-faint)', whiteSpace: 'nowrap', flexShrink: 0 }}>
        {item.time}
      </span>
    </a>
  )
}

// ── GroupedCard ────────────────────────────────────────────────────────────────

function GroupLabel({ label }: { label: string }) {
  return (
    <div style={{
      fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em',
      color: 'var(--color-text-faint)', marginBottom: 8, marginTop: 20,
    }}>
      {label}
    </div>
  )
}

// ── Main export ────────────────────────────────────────────────────────────────

export function NotificationsList({ notifications }: { notifications: Notification[] }) {
  const [, startTransition] = useTransition()

  useEffect(() => {
    if (notifications.some(n => !n.readAt)) {
      startTransition(() => { markAllReadAction().catch(console.error) })
    }
  }, [notifications])

  // Show mock groups when empty
  if (notifications.length === 0) {
    return (
      <div>
        {MOCK_GROUPS.map(group => (
          <div key={group.label}>
            <GroupLabel label={group.label} />
            <div style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius)',
              boxShadow: 'var(--shadow-card)',
              overflow: 'hidden',
            }}>
              {group.items.map((item, i) => (
                <MockNotificationRow key={item.id} item={item} isFirst={i === 0} />
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  const groups = bucketNotifications(notifications)

  return (
    <div>
      {groups.map(group => (
        <div key={group.label}>
          <GroupLabel label={group.label} />
          <div style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius)',
            boxShadow: 'var(--shadow-card)',
            overflow: 'hidden',
          }}>
            {group.items.map((n, i) => (
              <RealNotificationRow key={n.id} n={n} isFirst={i === 0} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
