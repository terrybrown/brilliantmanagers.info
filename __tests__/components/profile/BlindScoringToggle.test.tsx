import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockUpdateBlindScoringAction = vi.fn().mockResolvedValue(undefined)
vi.mock('@/app/(app)/profile/actions', () => ({
  updateBlindScoringAction: (...args: unknown[]) => mockUpdateBlindScoringAction(...args),
}))

import { BlindScoringToggle } from '@/components/profile/BlindScoringToggle'

describe('BlindScoringToggle', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders with aria-checked=false when initialValue is false', () => {
    render(<BlindScoringToggle initialValue={false} />)
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false')
  })

  it('renders with aria-checked=true when initialValue is true', () => {
    render(<BlindScoringToggle initialValue={true} />)
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true')
  })

  it('calls updateBlindScoringAction(true) when toggled from false', async () => {
    render(<BlindScoringToggle initialValue={false} />)
    await act(async () => { fireEvent.click(screen.getByRole('switch')) })
    expect(mockUpdateBlindScoringAction).toHaveBeenCalledWith(true)
  })

  it('calls updateBlindScoringAction(false) when toggled from true', async () => {
    render(<BlindScoringToggle initialValue={true} />)
    await act(async () => { fireEvent.click(screen.getByRole('switch')) })
    expect(mockUpdateBlindScoringAction).toHaveBeenCalledWith(false)
  })
})
