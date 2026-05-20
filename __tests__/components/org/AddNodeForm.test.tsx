import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { AddNodeForm } from '@/components/org/AddNodeForm'

describe('AddNodeForm', () => {
  it('renders the input and Add button', () => {
    render(
      <AddNodeForm
        orgId="org-1"
        parentId="node-1"
        formAction={vi.fn()}
        onCancel={vi.fn()}
      />
    )
    expect(screen.getByPlaceholderText(/child group name/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add/i })).toBeInTheDocument()
  })

  it('renders the cancel button and calls onCancel when clicked', () => {
    const onCancel = vi.fn()
    render(
      <AddNodeForm
        orgId="org-1"
        parentId={null}
        formAction={vi.fn()}
        onCancel={onCancel}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: '✕' }))
    expect(onCancel).toHaveBeenCalled()
  })

  it('includes a hidden orgId input', () => {
    const { container } = render(
      <AddNodeForm
        orgId="org-1"
        parentId={null}
        formAction={vi.fn()}
        onCancel={vi.fn()}
      />
    )
    const hidden = container.querySelector('input[name="orgId"]') as HTMLInputElement
    expect(hidden?.value).toBe('org-1')
  })

  it('includes a hidden parentId input when parentId is set', () => {
    const { container } = render(
      <AddNodeForm
        orgId="org-1"
        parentId="node-parent"
        formAction={vi.fn()}
        onCancel={vi.fn()}
      />
    )
    const hidden = container.querySelector('input[name="parentId"]') as HTMLInputElement
    expect(hidden?.value).toBe('node-parent')
  })

  it('omits the parentId hidden input when parentId is null', () => {
    const { container } = render(
      <AddNodeForm
        orgId="org-1"
        parentId={null}
        formAction={vi.fn()}
        onCancel={vi.fn()}
      />
    )
    expect(container.querySelector('input[name="parentId"]')).toBeNull()
  })
})
