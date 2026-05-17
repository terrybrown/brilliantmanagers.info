import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DashboardTour } from '@/components/dashboard/DashboardTour'

const mockDrive = vi.fn()
const mockDestroy = vi.fn()
let capturedOnDestroyed: (() => void) | undefined
let capturedSteps: unknown[] = []

vi.mock('driver.js', () => ({
  driver: vi.fn((config: { onDestroyed?: () => void; steps?: unknown[] }) => {
    capturedOnDestroyed = config.onDestroyed
    capturedSteps = config.steps ?? []
    return { drive: mockDrive, destroy: mockDestroy }
  }),
}))

vi.mock('driver.js/dist/driver.css', () => ({}))

beforeEach(() => {
  mockDrive.mockReset()
  mockDestroy.mockReset()
  localStorage.clear()
  capturedOnDestroyed = undefined
  capturedSteps = []
})

describe('DashboardTour', () => {
  it('renders the tour trigger button', () => {
    render(<DashboardTour />)
    expect(screen.getByRole('button', { name: /take a 30-second tour/i })).toBeTruthy()
  })

  it('starts the driver tour when the button is clicked', () => {
    render(<DashboardTour />)
    fireEvent.click(screen.getByRole('button', { name: /take a 30-second tour/i }))
    expect(mockDrive).toHaveBeenCalledTimes(1)
  })

  it('configures driver.js with exactly 5 steps', () => {
    render(<DashboardTour />)
    fireEvent.click(screen.getByRole('button', { name: /take a 30-second tour/i }))
    expect(capturedSteps).toHaveLength(5)
  })

  it('sets bm_tour_seen in localStorage when the tour ends', () => {
    render(<DashboardTour />)
    fireEvent.click(screen.getByRole('button', { name: /take a 30-second tour/i }))
    capturedOnDestroyed?.()
    expect(localStorage.getItem('bm_tour_seen')).toBe('1')
  })

  it('does not call driver.destroy() explicitly — driver.js manages its own lifecycle', () => {
    render(<DashboardTour />)
    fireEvent.click(screen.getByRole('button', { name: /take a 30-second tour/i }))
    capturedOnDestroyed?.()
    expect(mockDestroy).not.toHaveBeenCalled()
  })
})
