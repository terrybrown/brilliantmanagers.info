import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { AddConnectionForm } from '@/components/people/AddConnectionForm'

const mockTrackManagerInvited = vi.hoisted(() => vi.fn())
const mockUseActionState = vi.hoisted(() => vi.fn())

vi.mock('@/lib/analytics', () => ({
  trackManagerInvited: mockTrackManagerInvited,
}))

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>()
  return {
    ...actual,
    useActionState: mockUseActionState,
  }
})

beforeEach(() => {
  mockTrackManagerInvited.mockReset()
})

describe('AddConnectionForm analytics', () => {
  it('calls trackManagerInvited when state.success becomes true', () => {
    mockUseActionState.mockReturnValue([{ success: true }, vi.fn(), false])
    render(<AddConnectionForm />)
    expect(mockTrackManagerInvited).toHaveBeenCalledTimes(1)
  })

  it('does not call trackManagerInvited when state.success is false', () => {
    mockUseActionState.mockReturnValue([{ success: false }, vi.fn(), false])
    render(<AddConnectionForm />)
    expect(mockTrackManagerInvited).not.toHaveBeenCalled()
  })
})
