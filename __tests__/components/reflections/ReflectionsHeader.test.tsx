import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ReflectionsHeader } from '@/components/reflections/ReflectionsHeader'

vi.mock('@/components/reflections/CreateRoundModal', () => ({
  CreateRoundModal: ({ open }: { open: boolean }) => (
    open ? <div role="dialog">Modal</div> : null
  ),
}))

vi.mock('@/components/reflections/ActiveRoundCard', () => ({
  ActiveRoundCard: ({ onNewRound }: { onNewRound?: () => void }) => (
    <div>
      <button onClick={onNewRound}>Start round</button>
    </div>
  ),
}))

describe('ReflectionsHeader', () => {
  const defaultProps = {
    inProgressRound: null,
    scoredPillarCount: 0,
    nextRoundTitle: 'Q3 2026',
  }

  it('renders the Reflections title', () => {
    render(<ReflectionsHeader {...defaultProps} />)
    expect(screen.getByText('Reflections')).toBeInTheDocument()
  })

  it('renders the + New round button', () => {
    render(<ReflectionsHeader {...defaultProps} />)
    expect(screen.getByRole('button', { name: /new round/i })).toBeInTheDocument()
  })

  it('opens the modal when + New round is clicked', () => {
    render(<ReflectionsHeader {...defaultProps} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /new round/i }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('opens the modal when ActiveRoundCard triggers onNewRound', () => {
    render(<ReflectionsHeader {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: /start round/i }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})
