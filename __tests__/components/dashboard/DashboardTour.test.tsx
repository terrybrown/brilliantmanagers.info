import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
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

const TOUR_ELEMENT_IDS = ['nav-dashboard', 'nav-growth', 'nav-people', 'nav-avatar', 'dashboard-cta-btn']

function setupTourElements() {
  TOUR_ELEMENT_IDS.forEach(id => {
    const el = document.createElement('div')
    el.id = id
    document.body.appendChild(el)
  })
}

function teardownTourElements() {
  TOUR_ELEMENT_IDS.forEach(id => {
    document.getElementById(id)?.remove()
  })
}

beforeEach(() => {
  mockDrive.mockReset()
  mockDestroy.mockReset()
  localStorage.clear()
  capturedOnDestroyed = undefined
  capturedSteps = []
  setupTourElements()
})

afterEach(() => {
  teardownTourElements()
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

  it('configures driver.js with exactly 5 steps when all nav elements exist', () => {
    render(<DashboardTour />)
    fireEvent.click(screen.getByRole('button', { name: /take a 30-second tour/i }))
    expect(capturedSteps).toHaveLength(5)
  })

  it('skips steps for elements that do not exist in the DOM', () => {
    document.getElementById('nav-people')?.remove()
    render(<DashboardTour />)
    fireEvent.click(screen.getByRole('button', { name: /take a 30-second tour/i }))
    expect(capturedSteps).toHaveLength(4)
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
