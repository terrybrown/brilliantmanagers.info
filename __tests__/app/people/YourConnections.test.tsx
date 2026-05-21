import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { YourConnections } from '@/app/(app)/people/YourConnections'
import type { EnrichedConnection } from '@/app/(app)/people/types'
import type { DirectReportRoundSummary } from '@/lib/db/direct-reports'

const mockTrackConnectionAccepted = vi.hoisted(() => vi.fn())

vi.mock('@/lib/analytics', () => ({
  trackConnectionAccepted: mockTrackConnectionAccepted,
}))

vi.mock('@/app/(app)/connections/actions', () => ({
  inviteConnection: vi.fn(),
  acceptConnectionAction: vi.fn(),
}))

vi.mock('@/components/people/InviteManagerModal', () => ({
  InviteManagerModal: () => <button>Invite your manager</button>,
}))

const emptyConns = { asManager: [], asDirectReport: [] }

function makeConn(overrides: Partial<EnrichedConnection>): EnrichedConnection {
  return {
    id: 'c1', manager_id: 'm1', direct_report_id: 'dr1',
    status: 'active', initiated_by: 'm1', created_at: '',
    manager: { id: 'm1', email: 'mgr@x.com', display_name: 'The Manager' },
    direct_report: { id: 'dr1', email: 'dr@x.com', display_name: 'The Report' },
    ...overrides,
  }
}

describe('YourConnections', () => {
  beforeEach(() => {
    mockTrackConnectionAccepted.mockReset()
  })

  it('shows Invite your manager when no manager connected', () => {
    render(<YourConnections connections={emptyConns} roundSummaries={{}} userId="u1" pendingInvitations={[]} />)
    expect(screen.getByText('Invite your manager')).toBeInTheDocument()
  })

  it('shows manager name when active manager connection exists', () => {
    const conn = makeConn({ manager_id: 'mgr-1', direct_report_id: 'u1', status: 'active' })
    render(
      <YourConnections
        connections={{ asManager: [], asDirectReport: [conn] }}
        roundSummaries={{}} userId="u1" pendingInvitations={[]}
      />
    )
    expect(screen.getByText('The Manager')).toBeInTheDocument()
  })

  it('shows pending badge for outbound manager invite', () => {
    const conn = makeConn({
      manager_id: 'mgr-1', direct_report_id: 'u1',
      status: 'pending', initiated_by: 'u1',
    })
    render(
      <YourConnections
        connections={{ asManager: [], asDirectReport: [conn] }}
        roundSummaries={{}} userId="u1" pendingInvitations={[]}
      />
    )
    expect(screen.getByText(/pending/i)).toBeInTheDocument()
  })

  it('shows direct report name', () => {
    const conn = makeConn({ manager_id: 'u1', status: 'active' })
    const summary: DirectReportRoundSummary = {
      roundStatus: 'in_progress', lastScore: 3.8,
      nextScheduledDate: '2026-06-15', managerHasScored: false,
    }
    render(
      <YourConnections
        connections={{ asManager: [conn], asDirectReport: [] }}
        roundSummaries={{ dr1: summary }} userId="u1" pendingInvitations={[]}
      />
    )
    expect(screen.getByText('The Report')).toBeInTheDocument()
    expect(screen.getByText('3.8')).toBeInTheDocument()
  })

  it('shows Accept button for incoming pending invites', () => {
    const conn = makeConn({ manager_id: 'u1', status: 'pending', initiated_by: 'dr1' })
    render(
      <YourConnections
        connections={{ asManager: [conn], asDirectReport: [] }}
        roundSummaries={{}} userId="u1" pendingInvitations={[]}
      />
    )
    expect(screen.getByRole('button', { name: /accept/i })).toBeInTheDocument()
  })

  it('calls trackConnectionAccepted when Accept button is clicked', () => {
    const conn = makeConn({ manager_id: 'u1', status: 'pending', initiated_by: 'dr1' })
    render(
      <YourConnections
        connections={{ asManager: [conn], asDirectReport: [] }}
        roundSummaries={{}} userId="u1" pendingInvitations={[]}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /accept/i }))
    expect(mockTrackConnectionAccepted).toHaveBeenCalledTimes(1)
  })
})
