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

  it('does not attach any click handler (avatar stack is passive)', () => {
    const handleClick = vi.fn()
    const { container } = render(
      <MemberStack
        members={[makeMember('u1', 'Alice')]}
        pendingInvites={[]}
      />
    )
    container.firstElementChild?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(handleClick).not.toHaveBeenCalled()
  })
})
