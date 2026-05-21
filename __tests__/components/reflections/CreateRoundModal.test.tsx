import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CreateRoundModal } from '@/components/reflections/CreateRoundModal'

const mockCreateRoundAction = vi.fn()

vi.mock('@/app/(app)/reflections/actions', () => ({
  createRoundAction: (...args: unknown[]) => mockCreateRoundAction(...args),
}))

describe('CreateRoundModal', () => {
  beforeEach(() => {
    mockCreateRoundAction.mockReset()
  })

  it('does not render when open is false', () => {
    render(
      <CreateRoundModal
        open={false}
        onClose={() => {}}
        defaultTitle="Q2 2026"
      />
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders the modal with a dialog role when open', () => {
    render(
      <CreateRoundModal
        open={true}
        onClose={() => {}}
        defaultTitle="Q2 2026"
      />
    )
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('pre-fills the title input with defaultTitle', () => {
    render(
      <CreateRoundModal
        open={true}
        onClose={() => {}}
        defaultTitle="Q3 2026"
      />
    )
    const titleInput = screen.getByLabelText(/title/i)
    expect(titleInput).toHaveValue('Q3 2026')
  })

  it('renders optional fields: remind_at and notes', () => {
    render(
      <CreateRoundModal
        open={true}
        onClose={() => {}}
        defaultTitle="Q2 2026"
      />
    )
    expect(screen.getByLabelText(/remind me by/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/intention/i)).toBeInTheDocument()
  })

  it('calls onClose when Cancel is clicked', () => {
    const onClose = vi.fn()
    render(
      <CreateRoundModal
        open={true}
        onClose={onClose}
        defaultTitle="Q2 2026"
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(onClose).toHaveBeenCalled()
  })

  it('renders a submit button with text "Start reflection"', () => {
    render(
      <CreateRoundModal
        open={true}
        onClose={() => {}}
        defaultTitle="Q2 2026"
      />
    )
    expect(screen.getByRole('button', { name: /start reflection/i })).toBeInTheDocument()
  })
})
