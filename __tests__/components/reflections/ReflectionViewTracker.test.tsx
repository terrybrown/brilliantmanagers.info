import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'

const mockTrackReflectionViewed = vi.fn()
vi.mock('@/lib/analytics', () => ({
  trackReflectionViewed: (...args: unknown[]) => mockTrackReflectionViewed(...args),
}))

import { ReflectionViewTracker } from '@/components/reflections/ReflectionViewTracker'

describe('ReflectionViewTracker', () => {
  beforeEach(() => {
    mockTrackReflectionViewed.mockReset()
  })

  it('calls trackReflectionViewed on mount with roundId and status', () => {
    render(<ReflectionViewTracker roundId="round-123" status="complete" />)
    expect(mockTrackReflectionViewed).toHaveBeenCalledWith('round-123', 'complete')
  })

  it('renders nothing visible', () => {
    const { container } = render(
      <ReflectionViewTracker roundId="round-123" status="in_progress" />
    )
    expect(container.firstChild).toBeNull()
  })
})
