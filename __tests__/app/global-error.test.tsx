import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

const mockCaptureException = vi.hoisted(() => vi.fn())
vi.mock('@sentry/nextjs', () => ({ captureException: mockCaptureException }))

import GlobalError from '@/app/global-error'

describe('GlobalError boundary', () => {
  beforeEach(() => {
    mockCaptureException.mockReset()
  })

  it('renders "Something went wrong" fallback', () => {
    render(<GlobalError error={new Error('boom')} reset={() => {}} />)
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument()
  })

  it('renders a Try again button', () => {
    render(<GlobalError error={new Error('boom')} reset={() => {}} />)
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
  })

  it('calls reset() when Try again is clicked', () => {
    const reset = vi.fn()
    render(<GlobalError error={new Error('boom')} reset={reset} />)
    fireEvent.click(screen.getByRole('button', { name: /try again/i }))
    expect(reset).toHaveBeenCalled()
  })

  it('calls Sentry.captureException with the error', () => {
    const error = new Error('test error')
    render(<GlobalError error={error} reset={() => {}} />)
    expect(mockCaptureException).toHaveBeenCalledWith(error)
  })
})
