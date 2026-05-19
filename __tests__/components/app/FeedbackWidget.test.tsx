import { describe, it, vi, expect } from 'vitest'
import { render } from '@testing-library/react'
import { useFeedbackWidget } from 'featurebase-js/react'
import { FeedbackWidget } from '@/components/app/FeedbackWidget'

vi.mock('featurebase-js/react', () => ({
  useFeedbackWidget: vi.fn(),
  FeaturebaseProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

describe('FeedbackWidget', () => {
  it('renders without error', () => {
    render(<FeedbackWidget />)
    // No assertion needed — the test fails if the component throws
  })

  it('calls useFeedbackWidget with dark theme and right placement', () => {
    render(<FeedbackWidget />)
    expect(useFeedbackWidget).toHaveBeenCalledWith(
      expect.objectContaining({ theme: 'dark', placement: 'right' })
    )
  })
})
