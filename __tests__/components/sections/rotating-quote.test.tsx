import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { RotatingQuote } from '@/components/sections/rotating-quote'

// Pin Math.random so the Fisher-Yates shuffle always produces
// the original array order — makes assertions deterministic.
beforeEach(() => {
  vi.useFakeTimers()
  vi.spyOn(Math, 'random').mockReturnValue(0)
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('RotatingQuote', () => {
  it('renders a blockquote and an attribution on first paint', () => {
    const { container } = render(<RotatingQuote />)
    // blockquote has no implicit ARIA role — query by element name
    expect(container.querySelector('blockquote')).toBeInTheDocument()
    // Attribution line always starts with an em dash
    expect(screen.getByText(/^—\s/)).toBeInTheDocument()
  })

  it('shows the first quote from the list when Math.random is pinned to 0', () => {
    render(<RotatingQuote />)
    expect(screen.getByText(/Management is doing things right/i)).toBeInTheDocument()
    expect(screen.getByText(/— Peter Drucker/)).toBeInTheDocument()
  })

  it('advances to the second quote after 10 seconds + fade delay', () => {
    render(<RotatingQuote />)

    // Confirm first quote is shown
    expect(screen.getByText(/Management is doing things right/i)).toBeInTheDocument()

    // Fire the 10-second interval
    act(() => { vi.advanceTimersByTime(10000) })
    // Fire the 400ms fade-in delay
    act(() => { vi.advanceTimersByTime(400) })

    // Second quote in the list is also Peter Drucker
    expect(screen.getByText(/most important thing in communication/i)).toBeInTheDocument()
    expect(screen.getByText(/— Peter Drucker/)).toBeInTheDocument()
  })

  it('wraps back to the first quote after all 15 quotes have shown', () => {
    render(<RotatingQuote />)

    // Advance through all 15 quotes (14 transitions + 1 back to start)
    for (let i = 0; i < 15; i++) {
      act(() => { vi.advanceTimersByTime(10000) })
      act(() => { vi.advanceTimersByTime(400) })
    }

    expect(screen.getByText(/Management is doing things right/i)).toBeInTheDocument()
  })
})
