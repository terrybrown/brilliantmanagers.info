import { render, screen, fireEvent, waitFor } from '@testing-library/react'
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

  it('calls formAction with the form data on submit', async () => {
    const formAction = vi.fn().mockResolvedValue(undefined)
    render(
      <AddNodeForm
        orgId="org-1"
        parentId="node-parent"
        formAction={formAction}
        onCancel={vi.fn()}
      />
    )
    fireEvent.change(screen.getByPlaceholderText(/child group name/i), {
      target: { value: 'New Team' },
    })
    fireEvent.submit(screen.getByRole('button', { name: /add/i }).closest('form')!)
    await waitFor(() => expect(formAction).toHaveBeenCalledTimes(1))
    const fd = formAction.mock.calls[0][0] as FormData
    expect(fd.get('name')).toBe('New Team')
    expect(fd.get('orgId')).toBe('org-1')
    expect(fd.get('parentId')).toBe('node-parent')
  })

  it('shows an error message when formAction throws', async () => {
    const formAction = vi.fn().mockRejectedValue(new Error('server down'))
    render(
      <AddNodeForm
        orgId="org-1"
        parentId={null}
        formAction={formAction}
        onCancel={vi.fn()}
      />
    )
    fireEvent.change(screen.getByPlaceholderText(/child group name/i), {
      target: { value: 'Bad Team' },
    })
    fireEvent.submit(screen.getByRole('button', { name: /add/i }).closest('form')!)
    await waitFor(() => expect(screen.getByText(/failed to add group/i)).toBeInTheDocument())
  })
})
