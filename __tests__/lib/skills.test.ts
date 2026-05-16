import { describe, it, expect } from 'vitest'
import { SKILLS, PILLARS, getSkillsByPillar } from '@/lib/skills'

describe('SKILLS', () => {
  it('has 36 skills', () => {
    expect(SKILLS).toHaveLength(36)
  })

  it('every skill has a unique key', () => {
    const keys = SKILLS.map(s => s.key)
    expect(new Set(keys).size).toBe(SKILLS.length)
  })

  it('every skill belongs to a valid pillar', () => {
    SKILLS.forEach(s => {
      expect(PILLARS).toContain(s.pillar)
    })
  })

  it('every skill has a non-empty label and description', () => {
    SKILLS.forEach(s => {
      expect(s.label.length).toBeGreaterThan(0)
      expect(s.description.length).toBeGreaterThan(0)
    })
  })

  it('getSkillsByPillar returns correct count', () => {
    expect(getSkillsByPillar('self')).toHaveLength(9)
    expect(getSkillsByPillar('team')).toHaveLength(11)
    expect(getSkillsByPillar('strategy')).toHaveLength(8)
    expect(getSkillsByPillar('communications')).toHaveLength(6)
    expect(getSkillsByPillar('domain-expertise')).toHaveLength(2)
  })
})
