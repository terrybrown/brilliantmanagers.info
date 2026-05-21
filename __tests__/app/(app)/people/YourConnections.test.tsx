import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { YourConnections } from '@/app/(app)/people/YourConnections'
import type { EnrichedConnection } from '@/app/(app)/people/types'

const mockTrackConnectionAccepted = vi.hoisted(() => vi.fn())
const mockAcceptConnectionAction = vi.hoisted(() => vi.fn())

vi.mock('@/lib/analytics', () => ({
  trackConnectionAccepted: mockTrackConnectionAccepted,
}))

vi.mock('@/app/(app)/connections/actions', () => ({
  acceptConnectionAction: mockAcceptConnectionAction,
}))

vi.mock('@/components/people/AddConnectionForm', () => ({
  AddConnectionForm: () => null,
}))

vi.mock('@/components/people/InviteManagerModal', () => ({
  InviteManagerModal: () => null,
}))

const pendingConnection: EnrichedConnection = {
  id: 'conn-1',
  manager_id: 'other-user',
  direct_report_id: 'current-user',
  status: 'pending',
  initiated_by: 'other-user',
  created_at: '2026-01-01T00:00:00Z',
  manager: { id: 'other-user', email: 'boss@example.com', display_name: 'Boss' },
  direct_report: { id: 'current-user', email: 'me@example.com', display_name: 'Me' },
}

const defaultProps = {
  connections: {
    asManager: [pendingConnection],
    asDirectReport: [],
  },
  roundSummaries: {},
  userId: 'current-user',
  pendingInvitations: [],
}

beforeEach(() => {
  mockTrackConnectionAccepted.mockReset()
  mockAcceptConnectionAction.mockReset()
})

describe('YourConnections analytics', () => {
  it('calls trackConnectionAccepted when Accept is clicked', () => {
    render(<YourConnections {...defaultProps} />)
    const acceptButton = screen.getByRole('button', { name: /accept/i })
    fireEvent.click(acceptButton)
    expect(mockTrackConnectionAccepted).toHaveBeenCalledTimes(1)
  })
})
