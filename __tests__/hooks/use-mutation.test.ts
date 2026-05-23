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

describe('useMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

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

  it('calls toast.error with generic message when action throws', async () => {
    const { result } = renderHook(() => useMutation())
    await act(async () => {
      result.current.mutate(() => Promise.reject(new Error('Network failure')))
    })
    expect(toast.error).toHaveBeenCalledWith('Network failure')
  })

  it('calls onError when action throws', async () => {
    const onError = vi.fn()
    const { result } = renderHook(() => useMutation({ onError }))
    await act(async () => {
      result.current.mutate(() => Promise.reject(new Error('boom')))
    })
    expect(onError).toHaveBeenCalledWith('boom')
  })

  it('does not show error toast when action throws a redirect error', async () => {
    const redirectErr = new Error('NEXT_REDIRECT') as Error & { digest: string }
    redirectErr.digest = 'NEXT_REDIRECT;push;/somewhere;307;'
    const action = vi.fn().mockRejectedValue(redirectErr)

    const { result } = renderHook(() => useMutation())
    try {
      await act(async () => {
        result.current.mutate(action)
        await new Promise(r => setTimeout(r, 50))
      })
    } catch {
      // redirect errors are re-thrown — catching here is expected
    }

    expect(toast.error).not.toHaveBeenCalled()
  })
})
