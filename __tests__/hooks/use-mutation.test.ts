import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useMutation } from '@/hooks/use-mutation'

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

import { toast } from 'sonner'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useMutation', () => {
  it('starts not pending', () => {
    const { result } = renderHook(() => useMutation())
    expect(result.current.isPending).toBe(false)
  })

  it('calls toast.success with string message on ok result', async () => {
    const { result } = renderHook(() => useMutation({ onSuccess: 'Done!' }))
    await act(async () => {
      result.current.mutate(() => Promise.resolve({ ok: true as const }))
    })
    expect(toast.success).toHaveBeenCalledWith('Done!')
    expect(toast.error).not.toHaveBeenCalled()
  })

  it('calls toast.error with error string on not-ok result', async () => {
    const { result } = renderHook(() => useMutation())
    await act(async () => {
      result.current.mutate(() => Promise.resolve({ ok: false as const, error: 'Oops' }))
    })
    expect(toast.error).toHaveBeenCalledWith('Oops')
    expect(toast.success).not.toHaveBeenCalled()
  })

  it('calls onSuccess callback with data when ok', async () => {
    const onSuccess = vi.fn()
    const { result } = renderHook(() => useMutation<string>({ onSuccess }))
    await act(async () => {
      result.current.mutate(() => Promise.resolve({ ok: true as const, data: 'hello' }))
    })
    expect(onSuccess).toHaveBeenCalledWith('hello')
  })

  it('calls onError callback with error string when not ok', async () => {
    const onError = vi.fn()
    const { result } = renderHook(() => useMutation({ onError }))
    await act(async () => {
      result.current.mutate(() => Promise.resolve({ ok: false as const, error: 'bad' }))
    })
    expect(onError).toHaveBeenCalledWith('bad')
  })

  it('does not call toast.success when onSuccess is not provided', async () => {
    const { result } = renderHook(() => useMutation())
    await act(async () => {
      result.current.mutate(() => Promise.resolve({ ok: true as const }))
    })
    expect(toast.success).not.toHaveBeenCalled()
  })
})
