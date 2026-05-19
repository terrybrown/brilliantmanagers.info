import { describe, it, vi, expect } from 'vitest'
import { render } from '@testing-library/react'
import { useFeedbackWidget } from 'featurebase-js/react'
import { FeedbackWidget } from '@/components/app/FeedbackWidget'

vi.mock('featurebase-js/react', () => ({
  useFeedbackWidget: vi.fn(),
}))

describe('FeedbackWidget', () => {
  it('renders without error', () => {
    render(<FeedbackWidget />)
  })

  it('calls useFeedbackWidget with dark theme, bottom-right placement, and en locale', () => {
    render(<FeedbackWidget />)
    expect(useFeedbackWidget).toHaveBeenCalledWith({
      theme: 'dark',
      placement: 'bottom-right',
      locale: 'en',
    })
  })
})
