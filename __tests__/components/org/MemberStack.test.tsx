import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { MemberStack } from '@/components/org/MemberStack'
import type { OrgNode } from '@/lib/db/org-nodes'

const makeMember = (id: string, name: string): OrgNode['members'][0] => ({
  user_id: id,
  display_name: name,
  email: `${id}@x.com`,
})

describe('MemberStack', () => {
  it('renders nothing when there are no members or pending invites', () => {
    const { container } = render(
      <MemberStack members={[]} pendingInvites={[]} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders avatar circles for confirmed members', () => {
    render(
      <MemberStack
        members={[makeMember('u1', 'Alice'), makeMember('u2', 'Bob')]}
        pendingInvites={[]}
      />
    )
    expect(screen.getByText('AL')).toBeInTheDocument()
    expect(screen.getByText('BO')).toBeInTheDocument()
  })

  it('shows +N overflow when more than 3 members', () => {
    const members = [
      makeMember('u1', 'Alice'),
      makeMember('u2', 'Bob'),
      makeMember('u3', 'Carol'),
      makeMember('u4', 'Dave'),
    ]
    render(<MemberStack members={members} pendingInvites={[]} />)
    expect(screen.getByText('+1')).toBeInTheDocument()
  })

  it('renders a pending invites bubble when pending invites exist', () => {
    render(
      <MemberStack
        members={[]}
        pendingInvites={[{ id: 'inv-1', invited_email: 'p@x.com' }]}
      />
    )
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('root div has no onClick attribute (avatar stack is passive)', () => {
    const { container } = render(
      <MemberStack
        members={[makeMember('u1', 'Alice')]}
        pendingInvites={[]}
      />
    )
    expect(container.firstElementChild).not.toBeNull()
    // React attaches onClick as a property not an attribute, so check the React fiber
    const el = container.firstElementChild as HTMLElement
    expect(el.onclick).toBeNull()
  })

  it('does not show overflow when exactly 3 members', () => {
    const members = [
      makeMember('u1', 'Alice'),
      makeMember('u2', 'Bob'),
      makeMember('u3', 'Carol'),
    ]
    render(<MemberStack members={members} pendingInvites={[]} />)
    expect(screen.queryByText(/^\+\d/)).toBeNull()
  })

  it('renders pending bubble alongside confirmed members', () => {
    render(
      <MemberStack
        members={[makeMember('u1', 'Alice')]}
        pendingInvites={[{ id: 'inv-1', invited_email: 'p@x.com' }, { id: 'inv-2', invited_email: 'q@x.com' }]}
      />
    )
    expect(screen.getByText('AL')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
  })
})
