import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { NotificationsList } from '@/components/notifications/NotificationsList'
import type { Notification } from '@/lib/notifications'

vi.mock('@/app/(app)/notifications/actions', () => ({
  markAllReadAction: vi.fn().mockResolvedValue(undefined),
}))

const MANAGER_SCORING: Notification = {
  id: 'n1',
  userId: 'u1',
  type: 'manager_scoring_needed',
  payload: { directReportId: 'dr1', directReportName: 'Alice', roundId: 'r1' },
  readAt: null,
  createdAt: new Date(Date.now() - 3600_000).toISOString(),
}

const CONNECTION_REQUEST: Notification = {
  id: 'n2',
  userId: 'u1',
  type: 'connection_request_received',
  payload: { requesterId: 'u2', requesterName: 'Bob' },
  readAt: null,
  createdAt: new Date(Date.now() - 7200_000).toISOString(),
}

const CONNECTION_ACCEPTED: Notification = {
  id: 'n3',
  userId: 'u1',
  type: 'connection_accepted',
  payload: { acceptorId: 'u3', acceptorName: 'Carol' },
  readAt: '2026-05-20T12:00:00Z',
  createdAt: new Date(Date.now() - 86400_000).toISOString(),
}

const ROUND_SCHEDULED: Notification = {
  id: 'n4',
  userId: 'u1',
  type: 'round_scheduled',
  payload: { scheduledDate: '2026-07-01' },
  readAt: null,
  createdAt: new Date(Date.now() - 172800_000).toISOString(),
}

describe('NotificationsList', () => {
  it('renders empty state when no notifications', () => {
    render(<NotificationsList notifications={[]} />)
    expect(screen.getByText(/all caught up/i)).toBeInTheDocument()
  })

  it('renders manager_scoring_needed with DR name in description', () => {
    render(<NotificationsList notifications={[MANAGER_SCORING]} />)
    expect(screen.getByText(/alice/i)).toBeInTheDocument()
  })

  it('links manager_scoring_needed to manager scoring page', () => {
    render(<NotificationsList notifications={[MANAGER_SCORING]} />)
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', expect.stringContaining('/manager/dr1'))
  })

  it('renders connection_request_received with requester name', () => {
    render(<NotificationsList notifications={[CONNECTION_REQUEST]} />)
    expect(screen.getByText(/bob/i)).toBeInTheDocument()
  })

  it('renders connection_accepted with acceptor name', () => {
    render(<NotificationsList notifications={[CONNECTION_ACCEPTED]} />)
    expect(screen.getByText(/carol/i)).toBeInTheDocument()
  })

  it('renders round_scheduled with date', () => {
    render(<NotificationsList notifications={[ROUND_SCHEDULED]} />)
    expect(screen.getByText(/2026-07-01/i)).toBeInTheDocument()
  })

  it('unread rows have amber left border', () => {
    const { container } = render(<NotificationsList notifications={[MANAGER_SCORING]} />)
    const row = container.querySelector('[data-testid="notification-row"]')
    expect(row?.className).toMatch(/border-l-amber/)
  })

  it('read rows do not have amber left border', () => {
    const { container } = render(<NotificationsList notifications={[CONNECTION_ACCEPTED]} />)
    const row = container.querySelector('[data-testid="notification-row"]')
    expect(row?.className).not.toMatch(/border-l-amber/)
  })
})
