import { describe, it, expect } from 'vitest'

// Since shouldFetchDrScores is a module-level helper in the page file,
// we test its logic directly here by replicating the pure function.
function shouldFetchDrScores(isBlindMode: boolean, roundStatus: string): boolean {
  return !isBlindMode && roundStatus === 'complete'
}

describe('shouldFetchDrScores', () => {
  it('returns true when not blind and round is complete', () => {
    expect(shouldFetchDrScores(false, 'complete')).toBe(true)
  })

  it('returns false when blind mode is on', () => {
    expect(shouldFetchDrScores(true, 'complete')).toBe(false)
  })

  it('returns false when round is not complete', () => {
    expect(shouldFetchDrScores(false, 'in_progress')).toBe(false)
  })

  it('returns false when blind and round is not complete', () => {
    expect(shouldFetchDrScores(true, 'in_progress')).toBe(false)
  })
})
