import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { MemberStack } from '@/components/org/MemberStack'
import { addMemberToNodeAction } from '@/app/(app)/organisation/actions'
import type { OrgNode } from '@/lib/db/org-nodes'

vi.mock('@/app/(app)/organisation/actions', () => ({
  addMemberToNodeAction: vi.fn().mockResolvedValue({}),
  removeMemberFromNodeAction: vi.fn(),
  cancelPendingOrgNodeInvitationAction: vi.fn(),
}))

const makeMember = (id: string, name: string): OrgNode['members'][0] => ({
  user_id: id,
  display_name: name,
  email: `${id}@x.com`,
})

describe('MemberStack', () => {
  it('shows "0 people" when there are no members or pending invites', () => {
    render(
      <MemberStack
        members={[]}
        pendingInvites={[]}
        nodeId="n1"
        orgId="org-1"
        isAdmin={false}
        isOpen={false}
        onToggle={vi.fn()}
      />
    )
    expect(screen.getByText('0 people')).toBeInTheDocument()
  })

  it('calls onToggle when admin clicks "0 people"', () => {
    const onToggle = vi.fn()
    render(
      <MemberStack
        members={[]}
        pendingInvites={[]}
        nodeId="n1"
        orgId="org-1"
        isAdmin={true}
        isOpen={false}
        onToggle={onToggle}
      />
    )
    fireEvent.click(screen.getByText('0 people'))
    expect(onToggle).toHaveBeenCalledTimes(1)
  })

  it('does not call onToggle when non-admin clicks "0 people"', () => {
    const onToggle = vi.fn()
    render(
      <MemberStack
        members={[]}
        pendingInvites={[]}
        nodeId="n1"
        orgId="org-1"
        isAdmin={false}
        isOpen={false}
        onToggle={onToggle}
      />
    )
    fireEvent.click(screen.getByText('0 people'))
    expect(onToggle).not.toHaveBeenCalled()
  })

  it('renders avatar circles for members', () => {
    const members = [makeMember('u1', 'Alice'), makeMember('u2', 'Bob'), makeMember('u3', 'Carol')]
    render(
      <MemberStack
        members={members}
        pendingInvites={[]}
        nodeId="n1"
        orgId="org-1"
        isAdmin={false}
        isOpen={false}
        onToggle={vi.fn()}
      />
    )
    expect(screen.getByText('AL')).toBeInTheDocument()
    expect(screen.getByText('BO')).toBeInTheDocument()
    expect(screen.getByText('CA')).toBeInTheDocument()
  })

  it('shows +N overflow when more than 3 members', () => {
    const members = [
      makeMember('u1', 'Alice'),
      makeMember('u2', 'Bob'),
      makeMember('u3', 'Carol'),
      makeMember('u4', 'Dave'),
    ]
    render(
      <MemberStack
        members={members}
        pendingInvites={[]}
        nodeId="n1"
        orgId="org-1"
        isAdmin={false}
        isOpen={false}
        onToggle={vi.fn()}
      />
    )
    expect(screen.getByText('+1')).toBeInTheDocument()
  })

  it('calls onToggle when admin clicks the avatar stack', () => {
    const onToggle = vi.fn()
    render(
      <MemberStack
        members={[makeMember('u1', 'Alice')]}
        pendingInvites={[]}
        nodeId="n1"
        orgId="org-1"
        isAdmin={true}
        isOpen={false}
        onToggle={onToggle}
      />
    )
    fireEvent.click(screen.getByTitle(/manage members/i))
    expect(onToggle).toHaveBeenCalled()
  })

  it('does not make the avatar stack clickable for non-admins', () => {
    const onToggle = vi.fn()
    render(
      <MemberStack
        members={[makeMember('u1', 'Alice')]}
        pendingInvites={[]}
        nodeId="n1"
        orgId="org-1"
        isAdmin={false}
        isOpen={false}
        onToggle={onToggle}
      />
    )
    fireEvent.click(screen.getByText('AL'))
    expect(onToggle).not.toHaveBeenCalled()
  })

  it('shows member panel with chips when isOpen is true (admin)', () => {
    render(
      <MemberStack
        members={[makeMember('u1', 'Alice')]}
        pendingInvites={[]}
        nodeId="n1"
        orgId="org-1"
        isAdmin={true}
        isOpen={true}
        onToggle={vi.fn()}
      />
    )
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/add member by email/i)).toBeInTheDocument()
    // The confirmed member chip should have a ✕ remove button
    const removeButtons = screen.getAllByRole('button', { name: '✕' })
    expect(removeButtons.length).toBeGreaterThan(0)
  })

  it('shows pending invite chips labelled "awaiting registration"', () => {
    render(
      <MemberStack
        members={[]}
        pendingInvites={[{ id: 'inv-1', invited_email: 'pending@x.com' }]}
        nodeId="n1"
        orgId="org-1"
        isAdmin={true}
        isOpen={true}
        onToggle={vi.fn()}
      />
    )
    expect(screen.getByText('pending@x.com')).toBeInTheDocument()
    expect(screen.getByText(/awaiting registration/i)).toBeInTheDocument()
    // The pending invite chip should have a ✕ cancel button
    expect(screen.getByRole('button', { name: '✕' })).toBeInTheDocument()
  })

  it('shows an error message when addMemberToNodeAction returns an error', async () => {
    vi.mocked(addMemberToNodeAction).mockResolvedValueOnce({ error: 'User not found' })

    render(
      <MemberStack
        members={[]}
        pendingInvites={[{ id: 'inv-1', invited_email: 'pending@x.com' }]}
        nodeId="n1"
        orgId="org-1"
        isAdmin={true}
        isOpen={true}
        onToggle={vi.fn()}
      />
    )

    const emailInput = screen.getByPlaceholderText(/add member by email/i)
    fireEvent.change(emailInput, { target: { value: 'notfound@x.com' } })
    fireEvent.submit(emailInput.closest('form')!)

    await waitFor(() => expect(screen.getByText('User not found')).toBeInTheDocument())
  })
})
