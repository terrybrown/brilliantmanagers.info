import { describe, it, expect } from 'vitest'
import { ok, err, type ActionResult } from '@/lib/action-result'

describe('ok', () => {
  it('returns ok:true with no data', () => {
    const result: ActionResult = ok()
    expect(result).toEqual({ ok: true, data: undefined })
  })

  it('returns ok:true with data', () => {
    const result: ActionResult<number> = ok(42)
    expect(result).toEqual({ ok: true, data: 42 })
  })
})

describe('err', () => {
  it('returns ok:false with the error string', () => {
    const result: ActionResult = err('Something went wrong')
    expect(result).toEqual({ ok: false, error: 'Something went wrong' })
  })
})
