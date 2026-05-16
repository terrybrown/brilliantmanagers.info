import { SCORING_LEVELS, SCORING_LEVEL_DESCRIPTIONS, SCORING_LEVEL_COLORS } from '@/config/scoring'
import type { ScoringLevel } from '@/config/scoring'

describe('scoring config', () => {
  it('has exactly four levels in the correct order', () => {
    expect(SCORING_LEVELS).toEqual(['Developing', 'Practising', 'Proficient', 'Leading'])
  })

  it('has a description for every level', () => {
    SCORING_LEVELS.forEach((level) => {
      expect(SCORING_LEVEL_DESCRIPTIONS[level]).toBeTruthy()
      expect(SCORING_LEVEL_DESCRIPTIONS[level].length).toBeGreaterThan(20)
    })
  })

  it('has colour classes for every level', () => {
    SCORING_LEVELS.forEach((level) => {
      expect(SCORING_LEVEL_COLORS[level].bg).toBeTruthy()
      expect(SCORING_LEVEL_COLORS[level].text).toBeTruthy()
    })
  })

  it('ScoringLevel type covers all levels', () => {
    const level: ScoringLevel = 'Proficient'
    expect(SCORING_LEVELS).toContain(level)
  })
})
